const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const userAgentParser = require("user-agent-parser")

const app = express();
app.use(cors());
app.use(express.static("."));
app.use(express.json());  // 加入這一行來解析 JSON 請求體

let ratings = {};  // 用於儲存題目的評價

// 讀取題目評價
app.get("/ratings", (req, res) => {
    res.json(ratings);
});

app.post("/track_click", (req, res) => {
    console.log("收到請求:", req.body);  // ✅ 確保伺服器有接收到請求

    // 🔴 確保 filePath 變數在這裡有正確定義
    const filePath = path.join(__dirname, "trackClick.json");

    // 確保 req.body 有解析
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: "請求體為空，請檢查 fetch body" });
    }

    const { unitName, exerciseId, timestamp, info } = req.body;

    const parser = new userAgentParser(info);
    const parsedInfo = {
        browser: parser.getBrowser().name || "Unknown",
        os: parser.getOS().name ||"Unknown",
        device: parser.getDevice().type || "Unknown",
    };

    // 讀取檔案
    fs.readFile(filePath, (err, data) => {
        let clicks = [];
        if (err) {
            if (err.code === "ENOENT") {
                console.log("檔案不存在，將創建新檔案");
            } else {
                console.error("讀取檔案發生錯誤:", err);
                return res.status(500).json({ message: "伺服器讀取檔案時發生錯誤" });
            }
        } else {
            try {
                if (data.length > 0) {
                    clicks = JSON.parse(data);
                    if (!Array.isArray(clicks)) {
                        console.log("資料格式錯誤");
                        clicks = [];
                    }
                }
            } catch (parseError) {
                console.error("JSON解析錯誤:", parseError);
                return res.status(500).json({ message: "JSON 解析錯誤" });
            }
        }

        clicks.push({ unitName, exerciseId, timestamp, parsedInfo });

        fs.writeFile(filePath, JSON.stringify(clicks, null, 2), (err) => {
            if (err) {
                console.error("寫入檔案失敗:", err);
                return res.status(500).json({ message: "儲存點擊紀錄失敗" });
            } else {
                res.status(200).json({ message: "儲存點擊紀錄成功" });
            }
        });
    });
});



// 接收題目評價
app.post("/rate_question", express.json(), (req, res) => {
    const { questionId, rating } = req.body;

    //  ratings
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

app.get("/secretPage", (req, res) => {
    res.sendFile(path.join(__dirname, "secretPage.html"));
});

// 提供點擊紀錄的 JSON 資料
app.get("/track_click_data", (req, res) => {
    const filePath = path.join(__dirname, "trackClick.json");

    fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
            if (err.code === "ENOENT") {
                return res.json([]); // 如果檔案不存在，回傳空陣列
            } else {
                return res.status(500).json({ message: "讀取紀錄時發生錯誤" });
            }
        }

        try {
            const clicks = JSON.parse(data);
            res.json(clicks);
        } catch (parseError) {
            res.status(500).json({ message: "JSON 解析錯誤" });
        }
    });
});


app.listen(8000, () => {
    console.log("伺服器運行於 http://localhost:8000");
});
