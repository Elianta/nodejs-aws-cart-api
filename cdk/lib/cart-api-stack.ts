import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';

export class CartApiStack extends cdk.Stack {
  private cartApiLambda: lambda.Function;
  private api: apigateway.RestApi;
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.createLambdaFunctions();
    this.createApiGateway();
    this.createOutputs();
  }

  private createLambdaFunctions(): void {
    this.cartApiLambda = new lambda.Function(this, 'CartApiHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'lambda.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../dist'), {}),
      timeout: cdk.Duration.seconds(10),
    });
  }

  private createApiGateway(): void {
    this.api = new apigateway.RestApi(this, 'CartApi');

    this.api.root.addProxy({
      defaultIntegration: new apigateway.LambdaIntegration(this.cartApiLambda),
      anyMethod: true,
    });
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
  }
}
