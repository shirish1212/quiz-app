var responseFormatter = function() {}

responseFormatter.prototype.success = function (results) {
    return {
            statusCode: 200,         
            body:{
                    status: true,
                    data: results ? results : [],
                    error_code: null,
                    message: 'success'
                },
        }
}

responseFormatter.prototype.error = function (message, errors=null) {
    return {
        statusCode: 500,     
        body: {
                status: false,
                error_code: 500,
                data: errors ? errors : [],
                message: message
            }
    }
}

responseFormatter.prototype.unAuthorize = function (message) {
    return {
        statusCode: 404,    
        body: JSON.stringify(
            {
                status: false,
                error_code: 404,
                data: [],
                message: message
            },
        ),
    }
}

module.exports = responseFormatter;