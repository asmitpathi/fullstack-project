const asyncHandler= (requestHandler)=>{
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next))
        .catch((err) => next(err))
    }
}

export {asyncHandler}





//This is another way
// const asynHandler= (requestHandler) => async (req, res, next) => {
//     try{
//         await requestHandler(req, res, next)
//     } catch(error){
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }



/*
const functionName= (x) => (y) => {

}  is same as 

const functionName= (x) => {
    (y) => {
        
    }
}
*/