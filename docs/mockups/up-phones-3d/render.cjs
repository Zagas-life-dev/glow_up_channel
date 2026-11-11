// Render index.html to a PNG. Usage: node render.cjs [width] [height] [out.png] [extra query]
// e.g. node render.cjs 1200 2000 phone-home.png "single=home&ry=-0.35"  (transparent single phone)
// Serves this folder over local HTTP (WebGL can't read textures from file://),
// opens the scene in headless Chrome and screenshots it at 2x.
const http = require("http");
const fs = require("fs");
const path = require("path");
const puppeteer = require(path.join(process.env.APPDATA, "npm/node_modules/puppeteer"));

const [w = 1920, h = 1080] = process.argv.slice(2, 4).map(Number);
const out = path.resolve(__dirname, process.argv[4] || "up-phones-3d.png");
const extra = process.argv[5] || "";
const types = { ".html": "text/html", ".png": "image/png", ".js": "text/javascript" };

const server = http.createServer((req, res) => {
  const file = path.join(__dirname, decodeURIComponent(req.url.split("?")[0]).replace(/^\/$/, "/index.html"));
  if (!file.startsWith(__dirname) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(0, "127.0.0.1", async () => {
  const port = server.address().port;
  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: "new",
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage();
  page.on("console", m => m.type() === "error" && console.log("page:", m.text()));
  page.on("pageerror", e => console.log("pageerror:", e.message));
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
  await page.goto(`http://127.0.0.1:${port}/?still&dpr=2${extra ? "&" + extra : ""}`, { waitUntil: "networkidle0", timeout: 120000 });
  await page.waitForFunction("window.READY === true", { timeout: 180000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: out, omitBackground: Boolean(extra) });
  console.log("saved", out);
  await browser.close();
  server.close();
});
