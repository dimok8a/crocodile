const express = require("express")
const path = require("path");

const app = express();
app.use(express.static(path.resolve(__dirname, 'public')));
const PORT = 5000

app.get("/*", (req, res)=> {
    res.sendFile(path.resolve(__dirname, 'client', 'index.html'));
})
app.listen(PORT, () => console.log(`server has been started on port ${PORT}`));
