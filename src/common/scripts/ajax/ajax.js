(function () {
    function ajax(methods, parameter, header,cb) {
        $.ajax({
            type: methods,
            url: parameter.url,
            data: parameter.data,
            dataType: parameter.dataType,
            success: function (data) {
                cb(data)
            }
        });
    }

})()