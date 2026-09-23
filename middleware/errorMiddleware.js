module.exports=(err,req,res,next)=>{console.error(err);res.status(err.status||500).json({error:'Something went wrong. Please try again.'})};
