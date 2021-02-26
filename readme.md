# Aliyun fc nodejs12 runtime initializer not invoked sample project

本工程用于复现阿里云函数计算 NodeJS12 运行环境的 Initializer 在本地执行 `fun local invoke` 
时不被调用的问题.

index.js:
```js
let initialized = false;

exports.initializer = function (ctx, callback) {
    console.log("Initializing")
    initialized = true;
    callback(null, null);
};

exports.handler = function (request, response, context) {
    response.setStatusCode(initialized ? 200 : 500);
    response.send(initialized ?
        "OK" :
        "Initializer not invoked!");
};
```

template.yaml:
```yaml
ROSTemplateFormatVersion: '2015-09-01'
Transform: 'Aliyun::Serverless-2018-04-03'
Resources:
  nodejs12-runtime: # service name
    Type: 'Aliyun::Serverless::Service'
    initializer-not-invoked-in-sandbox-env: # function name
      Type: 'Aliyun::Serverless::Function'
      Properties:
        Handler: index.handler
        Initializer: index.initializer
        InitializationTimeout : 3
        Runtime: nodejs12
        CodeUri: './'
      Events:
        http: # trigger name
          Type: HTTP # http trigger
          Properties:
            AuthType: ANONYMOUS
            Methods: [ 'GET' ]
```

复现步骤:

0. 通过 npm 安装 funcraft `npm i -g @alicloud/fun`, 截至本项目公布时, fun 最新版本为 `3.6.21`.
0. 在项目根目录下执行 `npm run start` 或直接执行 `fun local invoke` 触发异常:

   ```log
   > fun local invoke
   using template: template.yaml
   
   Missing invokeName argument, Fun will use the first function nodejs12-runtime/initializer-not-invoked-in-sandbox-env as invokeName
   
   skip pulling image aliyunfc/runtime-nodejs12:1.9.13...
   FC Initialize End RequestId: 3195b753-3bbd-4bf0-94ac-8141a8cea4b7, Error: Handled function error
   Error: Missing header x-fc-initialization-timeoutFC Invoke Start RequestId: 3195b753-3bbd-4bf0-94ac-8141a8cea4b7
   load code for handler:index.handler
   2021-02-26T06:04:35.443Z 3195b753-3bbd-4bf0-94ac-8141a8cea4b7 [error] TypeError: response.setStatusCode is not a function
       at exports.handler (/code/index.js:10:14)
   
   
   RequestId: 3195b753-3bbd-4bf0-94ac-8141a8cea4b7          Billed Duration: 89 ms          Memory Size: 12655 MB   Max Memory Used: 8 MB
   ```
   
0. 根据 funcraft 源码 https://github.com/alibaba/funcraft/blob/master/src/lib/docker-opts.js#L73-L89, 
   得知可以通过设置环境变量 `FC_DOCKER_VERSION` 指定使用的镜像版本.

0. 查询 https://hub.docker.com/r/aliyunfc/runtime-nodejs12/tags 得知最新版为 `1.9.14`.

0. 设置环境变量 `FC_DOCKER_VERSION` 为 `1.9.14` 后再次调用 `fun local invoke`:

    ```diff
    >fun local invoke
    using template: template.yaml
    
    Missing invokeName argument, Fun will use the first function nodejs12-runtime/initializer-not-invoked-in-sandbox-env as invokeName
    
    skip pulling image aliyunfc/runtime-nodejs12:1.9.14...
    FC Initialize Start RequestId: 42702c74-d871-49e3-af99-922d6cd06a34
    load code for handler:index.initializer
    2021-02-26T06:12:05.784Z 42702c74-d871-49e3-af99-922d6cd06a34 [verbose] Initializing   <==== Initializer invoked
    FC Initialize End RequestId: 42702c74-d871-49e3-af99-922d6cd06a34
    FC Invoke Start RequestId: 42702c74-d871-49e3-af99-922d6cd06a34
    load code for handler:index.handler
    2021-02-26T06:12:05.814Z 42702c74-d871-49e3-af99-922d6cd06a34 [error] TypeError: response.setStatusCode is not a function
    at exports.handler (/code/index.js:10:14)
    
    
    RequestId: 42702c74-d871-49e3-af99-922d6cd06a34          Billed Duration: 91 ms          Memory Size: 12655 MB   Max Memory Used: 8 MB
    ```
