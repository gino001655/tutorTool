const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.static("."));  // 讓 index.html 可以被載入

let ratings = {};  // 用於儲存題目的評價

// 讀取題目評價
app.get("/ratings", (req, res) => {
    res.json(ratings);
});

// 接收題目評價
app.post("/rate_question", express.json(), (req, res) => {
    const { questionId, rating } = req.body;

    // 儲存評價到 ratings
    if (!ratings[questionId]) {
        ratings[questionId] = [];
    }
    ratings[questionId].push(rating);

    // 回傳題號和評價資訊
    res.json({ 
        message: "評價已儲存",
        questionId: questionId,
        ratings: ratings[questionId]  // 傳回該題目的所有評價
    });
});

app.get("/exercises.json", (req, res) => {
    res.sendFile(__dirname + "/exercises.json");
}); 

app.listen(8000, () => {
    console.log("伺服器運行於 http://localhost:8000");
});
