const express = require("express");
const cors = require("cors");
const multer = require("multer")
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

app.get("/uploadPage", (req, res) => {
    res.sendFile(path.join(__dirname, "uploadPage.html"));
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


const DATA_FILE = path.join(__dirname, "exercises.json");
// 讀取 JSON 檔案
const readData = () => {
    try {
        const data = fs.readFileSync(DATA_FILE, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error("讀取 JSON 失敗:", error);
        return { chapters: [] };
    }
};

// 寫入 JSON 檔案
const writeData = (data) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 4), "utf8");
    } catch (error) {
        console.error("寫入 JSON 失敗:", error);
    }
};

app.get("/get-data", (req,res) => {
    const data = readData();
    res.json(data);
})

// 🔹 新增章節
app.post("/add-chapter", (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "章節名稱是必填的" });

    let data = readData();
    data.chapters.push({ name, units: [] });

    writeData(data);
    res.json({ message: "章節新增成功", data });
});

// 🔹 新增單元
app.post("/add-unit", (req, res) => {
    const { chapterName, unitName, image } = req.body;
    if (!chapterName || !unitName) return res.status(400).json({ error: "請提供章節名稱和單元名稱" });

    let data = readData();
    let chapter = data.chapters.find(c => c.name === chapterName);
    if (!chapter) return res.status(404).json({ error: "找不到對應章節" });

    chapter.units.push({ name: unitName, image, questions: [] });

    writeData(data);
    res.json({ message: "單元新增成功", data });
});

// 🔹 新增題目
app.post("/add-question", (req, res) => {
    const { chapterName, unitName, question, answer, image } = req.body;
    if (!chapterName || !unitName || !question || !answer) {
        return res.status(400).json({ error: "請提供完整的題目信息" });
    }

    let data = readData();
    let chapter = data.chapters.find(c => c.name === chapterName);
    if (!chapter) return res.status(404).json({ error: "找不到對應章節" });

    let unit = chapter.units.find(u => u.name === unitName);
    if (!unit) return res.status(404).json({ error: "找不到對應單元" });

    let newQuestion = {
        id: unit.questions.length + 1,
        question,
        answer,
        image,
        ratings: []
    };

    unit.questions.push(newQuestion);

    writeData(data);
    res.json({ message: "題目新增成功", data });
});


app.listen(8000, () => {
    console.log("伺服器運行於 http://localhost:8000");
});
