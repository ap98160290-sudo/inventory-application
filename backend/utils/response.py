def success_response(message, data=None, status_code=200):
    return {
        "status":"success",
        "status_code":status_code,
        "data":data,
        "message":message
        
        
    }
