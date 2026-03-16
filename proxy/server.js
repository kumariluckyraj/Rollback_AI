const express = require("express")
const httpProxy = require("http-proxy")
const fs = require("fs")
const cors = require("cors")

const app = express()
const proxy = httpProxy.createProxyServer({})

app.use(express.json())
app.use(cors())

const getConfig = () => {
    const data = fs.readFileSync("./config.json")
    return JSON.parse(data)
}

app.use((req,res)=>{

    const config = getConfig()

    let target

    if(config.mode === "stable"){
        target = config.stable_url
    }

    else if(config.mode === "test"){
        target = config.test_url
    }

    else if(config.mode === "canary"){

        const random = Math.random()*100

        if(random < config.canary_percent){
            target = config.test_url
        }else{
            target = config.stable_url
        }

    }

    proxy.web(req,res,{target})

})

app.listen(4000,()=>{
    console.log("Proxy running on port 4000")
})