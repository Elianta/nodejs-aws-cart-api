import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as path from 'path';

export class CartApiStack extends cdk.Stack {
  private cartApiLambda: lambda.Function;
  private api: apigateway.RestApi;
  private vpc: ec2.IVpc;
  private lambdaSG: ec2.SecurityGroup;
  private swaggerUi: lambda.Function;
  private sharedLayer: lambda.LayerVersion;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.createSharedLayer();
    this.importVpc();
    this.createSecurityGroup();
    this.allowLambdaAccessToRDS();
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

  private importVpc(): void {
    this.vpc = ec2.Vpc.fromLookup(this, 'ExistingVPC', {
      vpcId: process.env.VPC_ID,
    });
  }

  private createSecurityGroup(): void {
    this.lambdaSG = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Lambda function',
      allowAllOutbound: true,
    });
  }

  private allowLambdaAccessToRDS(): void {
    const rdsSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      'RDSSecurityGroup',
      process.env.RDS_SECURITY_GROUP_ID as string,
    );

    rdsSecurityGroup.addIngressRule(
      this.lambdaSG,
      ec2.Port.tcp(parseInt(process.env.RDS_PORT as string) || 5432),
      'Allow Lambda to access RDS',
    );
  }

  private createLambdaFunctions(): void {
    this.cartApiLambda = new lambda.Function(this, 'CartApiHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'lambda.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../dist'), {}),
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      allowPublicSubnet: true,
      securityGroups: [this.lambdaSG],
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
