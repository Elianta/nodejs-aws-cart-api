import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';

export class CartApiStack extends cdk.Stack {
  private cartApiLambda: lambda.Function;
  private api: apigateway.RestApi;
  private swaggerUi: lambda.Function;
  private sharedLayer: lambda.LayerVersion;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.createSharedLayer();
    this.createLambdaFunctions();
    this.createApiGateway();
    this.createOutputs();
  }

  private createSharedLayer(): void {
    this.sharedLayer = new lambda.LayerVersion(this, 'NodeJsLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../dist-cdk/layers')),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Node.js dependencies layer',
    });
  }

  private createLambdaFunctions(): void {
    this.cartApiLambda = new lambda.Function(this, 'CartApiHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'lambda.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../dist'), {}),
      environment: {
        DATABASE_URL: `postgresql://${process.env.RDS_USERNAME}:${process.env.RDS_PASSWORD}@${process.env.RDS_HOST}:${process.env.RDS_PORT}/${process.env.RDS_DATABASE}`,
        NODE_ENV: 'production',
        PRODUCTS_API_URL: `${process.env.PRODUCTS_API_URL}`,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Create the Swagger UI Lambda function
    this.swaggerUi = new lambda.Function(this, 'SwaggerUI', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../dist-cdk/functions/swagger-ui'),
      ),
      layers: [this.sharedLayer],
    });
  }

  private createApiGateway(): void {
    this.api = new apigateway.RestApi(this, 'CartApi');

    this.api.root.addProxy({
      defaultIntegration: new apigateway.LambdaIntegration(this.cartApiLambda),
      anyMethod: true,
    });

    // Swagger UI endpoint
    const docs = this.api.root.addResource('docs');
    docs.addMethod('GET', new apigateway.LambdaIntegration(this.swaggerUi));
  }

  private createOutputs(): void {
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: `${this.api.url}ping`,
      description: 'Ping endpoint URL',
    });

    new cdk.CfnOutput(this, 'CartApiDocs', {
      value: `${this.api.url}docs`,
      description: 'Cart API documentation URL',
    });
  }
}
