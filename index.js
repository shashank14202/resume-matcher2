const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const cors = require("cors");
const axios = require("axios");
const { MongoClient } = require("mongodb");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage });

const MONGO_URI = "mongodb+srv://shashank14202:shashank14202@shashank.k0r1s6s.mongodb.net/resumeDB?retryWrites=true&w=majority&appName=shashank";
const client = new MongoClient(MONGO_URI);
let collection;

client.connect().then(() => {
    const db = client.db("resumeDB");
    collection = db.collection("resumes");
    console.log("MongoDB connected");
}).catch(console.error);

app.post("/analyze", upload.single("resume"), async (req, res) => {
    try {
        const { jobDescription } = req.body;
        const pdfData = await pdfParse(req.file.buffer);
        const resumeText = pdfData.text;

        await collection.insertOne({
            text: resumeText,
            uploadedAt: new Date(),
        });

        const prompt = `
Compare the following resume and job description. Provide:
1. A match score (0-100).
2. Key strengths from the resume.
3. Weaknesses or missing skills.
4. Suggestions for improvement.

Resume:
${resumeText}

Job Description:
${jobDescription}
`;

        const geminiRes = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyC438_5bIi-hKYjviIYua_MkIZq3C4o1iI`,
            {
                contents: [{ parts: [{ text: prompt }] }],
            },
            {
                headers: { "Content-Type": "application/json" },
            }
        );

        const result = geminiRes.data.candidates[0].content.parts[0].text;
        res.json({ result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ result: "Error analyzing resume." });
    }
});

app.get("/", (req, res) => {
    res.send("Resume Matcher Backend is running");
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
