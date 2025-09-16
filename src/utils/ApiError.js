class ApiError extends Error{    //Erros is default provided
    constructor(
        statuscode,
        message= "Something went wrong",
        errors= [],
        stack= ""
    ){
        super(message)
        this.statuscode= statuscode
        this.data= null,
        this.message= message,
        this.success= false,
        this.errors= errors

        if(stack){
            this.stack= stack
        } else{
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export {ApiError}