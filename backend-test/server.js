const express = require("express")

const app = express()

app.get("/api", (req, res) => {

    if (Math.random() < 0.4) {
        res.status(500).json({
            error: "Random server crash"
        })
    } else {
        res.json({
            backend: "test",
            message: "Testing new version"
        })
    }

})

app.listen(5002, () => {
    console.log("Test backend running on port 5002")
})