const express=require('express');
const router=express.Router();

router.get('/',(req,res) => {
    res.send("Hey there how are you doing");
})

module.export ={router};