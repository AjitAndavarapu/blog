require('dotenv').config();

const express=require('express');
const expressLayout=require('express-ejs-layouts');
const methodOverride=require('method-override');
const cookieParaser=require('cookie-parser');
const MongoStore=require('connect-mongo');
const expressSession=require('express-session')
const bcrypt=require('bcrypt');
const jwt=require('jsonwebtoken'); 

//cookies for keeping the user logged in
const authMiddleWare=(req,res,next) =>{
    const token=req.cookies.token;
    if(!token){
        return res.status(401).json({message:'unauthorized'})
    }
    try{
        const decoded=jwt.verify(token,jwtsecret);
        req.userID=decoded.userID;
        next();
    }catch(err){
        return res.status(401).json({message:'unauthorized'})
    }
}




const router=express.Router();
const router1=express.Router()
const connectDB=require('./server/config/db');
const Post=require("./server/models/Post");
const User=require("./server/models/User");
const {isActiveRoute}=require('./server/helpers/routeHelpers');
const jwtsecret=process.env.JWT_SECRET; 

const app=express();

connectDB();

app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use(cookieParaser());
app.use(methodOverride('_method'));

app.use(expressSession({
    secret:'keyboard cat',
    resave:false,
    saveUninitialized:true,
    store:MongoStore.create({
        mongoUrl:process.env.MONGODB_URI
    })
    //cookie:{maxAge : new Date(Date.now()+(3600000))}
}));

app.use(express.static('public'));
//templating engine
app.use(expressLayout);
app.set('layout','./layouts/main');
app.set('view engine','ejs');
app.locals.isActiveRoute=isActiveRoute;

//Home Route
router .get("/",async (req,res)=>{
    const locals={
        title:"NodeJa Blog",
        description:"Blog website using nodejs and monngodb"
    }

    try{
        let perPage=2;
        let page=req.query.page ||1;

        const data= await Post.aggregate([{ $sort: {createdAt:-1} }])
        .skip(perPage*page-perPage)
        .limit(perPage)
        .exec();

        const count= await Post.count;
        const nextPage=parseInt(page)+1;
        const hasNextPage=nextPage <=Math.ceil(count/perPage);

        res.render('home',{locals,
            data,
            current:page,
            nextPage:hasNextPage? nextPage:null
        });
    }catch(err){
        console.log(err);
    }
});


app.get('/post/:id',async (req,res)=>{
    try{
        
        let slug=req.params.id;
        const data=await Post.findById({_id:slug});
        const locals={
            title:data.title,
            description:'Simple blog website with NodeJs, Express and MongoDB'
        }
        res.render('post',{locals,data});
    }catch(err){
        console.log(err);
    }
})

app.post('/search',async (req,res)=>{
    try{
        const locals={
            title:'Search',
            description:'Simple blog website with NodeJs, Express and MongoDB'
        }
        let searchTerm=req.body.searchTerm;
        const searchNoSpecialChar=searchTerm.replace(/[^a-zA-Z0-9]/g,"")
        const data=await Post.find({
            $or:[
                {title:{ $regex: new RegExp( searchNoSpecialChar,"i" ) }},
                {body:{ $regex: new RegExp( searchNoSpecialChar,"i" ) }}
            ]
        })


        res.render('search',{locals,data});
    }catch(err){
        console.log(err);
    }
})

app.use(router);

// function insertPostData(){
//     Post.insertMany([
//         {
//             title:"GIET UNIVERSITY",
//             body:"This is a body text"
//         }
//     ]);
// }


// insertPostData(); 


/**
 * Admin Route
 */

app.get('/admin',async(req,res)=>{
    try{
        const locals={
            title:"Admin",
            description:'This is a website made using nodejs Andd mongodb'
        }
        res.render('admin/admin_panel',{locals,layout:'../views/layouts/admin'});
    }catch(err){
        console.log(err);
    }
})

app.post('/admin',async(req,res)=>{
    try{
       const {username,password}=req.body;
       const user=await User.findOne({username})
       if(!user){
        return res.status(401).json({message:"Invalid credentials"});
       }
       const isPasswordValid=await bcrypt.compare(password,user.password)
       if(!isPasswordValid){
        return res.status(401).json({message:'Ivalid Credentials'})
       }
       const token=jwt.sign({userID:user._id},jwtsecret);
       res.cookie('token',token,{httpOnly:true})
       res.redirect('/dashboard');
    }catch(err){
        console.log(err);
    }
})

router.get('/dashboard',authMiddleWare,async(req,res)=>{
    try {
        const locals={
            title:'Dashboard',
            description:'Simple blog website using node js and mongodb.'
        }
        const data=await Post.find();
        res.render('admin/dashboard',{locals,data,layout:'../views/layouts/admin'})
    } catch (err) {
        console.log(err)
    }
})

//For adding new posts

router.get('/add-post',authMiddleWare,async(req,res)=>{
    try {
        const locals={
            title:'Add Post',
            description:'Simple blog website using node js and mongodb.'
        }
        res.render('admin/add-post',{locals,layout:'../views/layouts/admin'})
    } catch (err) {
        console.log(err)
    }
})

router.post('/add-post',authMiddleWare,async(req,res)=>{
    try {
            console.log(req.body);
            try {
                const newPost=new Post({
                    title:req.body.title,
                    body:req.body.body
                })
                await Post.create(newPost);
                res.redirect("/dashboard");
            } catch (error) {
                console.log(error);
            }
    } catch (err) {
        console.log(err)
    }
})

router.get('/edit-post/:id',authMiddleWare,async(req,res)=>{
    try {
        const locals={
            title:'edit-post',
            description:'Simple blog website using node js and mongodb.'
        }

        const data=await Post.findOne({_id:req.params.id});

        res.render('admin/edit-post',{
            locals,
            data,
            layout:'../views/layouts/admin'
        })
    } catch (error) {
        console.log(error);
    }
})

router.put('/edit-post/:id',authMiddleWare,async(req,res)=>{
    try {
        await Post.findByIdAndUpdate(req.params.id,{
            title:req.body.title,
            body:req.body.body,
            updatedAt:Date.now()
        })
        res.redirect(`/edit-post/${req.params.id}`);

    } catch (error) {
        console.log(error);
    }
})

router.delete('/delete-post/:id',authMiddleWare,async (req,res)=>{
    try {
        await Post.deleteOne({_id:req.params.id})
        res.redirect('/dashboard');
    } catch (err) {
        console.log(err);
    }
} )

app.post('/register',async(req,res)=>{
    try{
        const {username,password}=req.body;
        const hashedPassword=await bcrypt.hash(password,10);
        try {
            const user=await User.create({username,password:hashedPassword})
            res.status(201).json({message:'user created',user});
        } catch (error) {
            if(error.code===110000){
                res.status(409).json({message:'user already exists'})
            }
            res.status(500).json({message:'internal server error'})
        }


    }catch(err){
        console.log(err);
    }
})

app.get('/logout',(req,res)=>{
    res.clearCookie('token');
    // res.json({message:"Logout Successful."});
    res.redirect('/');
})

app.use(router1)


app.listen(3000,()=>{
    console.log("Listening on port 3000.")
})
