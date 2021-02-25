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
