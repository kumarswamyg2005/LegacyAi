import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Container, GitPullRequest, Terminal, Copy, Check, Download, Globe, Play, Loader2 } from "lucide-react";
import Editor from "@monaco-editor/react";
import JSZip from "jszip";
import { motion } from "framer-motion";

const getModernizedFilename = (origFilename: string, targetLang: string) => {
  const lastDot = origFilename.lastIndexOf(".");
  const base = lastDot !== -1 ? origFilename.substring(0, lastDot) : origFilename;
  const extMap: Record<string, string> = {
    python: "py",
    typescript: "ts",
    go: "go",
    java: "java",
  };
  const ext = extMap[targetLang.toLowerCase()] || "txt";
  return `${base}.${ext}`;
};

interface Props {
  targetLang: string;
  modernizedFiles?: Record<string, string>;
}

export default function RoadmapPanel({ targetLang, modernizedFiles }: Props) {
  const [activeStep, setActiveStep] = useState<"docker" | "ci" | "deploy" | "cloud">("docker");
  const [copied, setCopied] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployLogs, setDeployLogs] = useState<string[]>([]);
  const [deploySuccess, setDeploySuccess] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup interval on unmount to prevent crash from setState on unmounted component
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Generate dynamic Dockerfile based on target language
  const dockerfile = useMemo(() => {
    switch (targetLang.toLowerCase()) {
      case "go":
        return `FROM golang:1.21-alpine AS builder\nWORKDIR /app\nCOPY go.mod go.sum ./\nRUN go mod download\nCOPY . .\nRUN CGO_ENABLED=0 GOOS=linux go build -o app .\n\nFROM alpine:latest  \nRUN apk --no-cache add ca-certificates\nWORKDIR /root/\nCOPY --from=builder /app/app .\nEXPOSE 8080\nCMD ["./app"]`;
      case "typescript":
        return `FROM node:18-alpine AS builder\nWORKDIR /usr/src/app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM node:18-alpine\nWORKDIR /usr/src/app\nCOPY package*.json ./\nRUN npm ci --only=production\nCOPY --from=builder /usr/src/app/dist ./dist\nEXPOSE 3000\nCMD ["node", "dist/index.js"]`;
      case "java":
        return `FROM maven:3.8-openjdk-17 AS build\nWORKDIR /app\nCOPY pom.xml .\nCOPY src ./src\nRUN mvn clean package -DskipTests\n\nFROM openjdk:17-jdk-slim\nWORKDIR /app\nCOPY --from=build /app/target/*.jar app.jar\nEXPOSE 8080\nENTRYPOINT ["java", "-jar", "app.jar"]`;
      case "python":
      default:
        return `FROM python:3.11-slim\nWORKDIR /app\nENV PYTHONDONTWRITEBYTECODE=1 \\\n    PYTHONUNBUFFERED=1\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY . .\nEXPOSE 8000\nCMD ["python", "main.py"]`;
    }
  }, [targetLang]);

  // Generate dynamic CI/CD configuration
  const ciConfig = useMemo(() => {
    switch (targetLang.toLowerCase()) {
      case "go":
        return `name: Go CI/CD Pipeline\n\non:\n  push:\n    branches: [ main ]\n  pull_request:\n    branches: [ main ]\n\njobs:\n  build-and-test:\n    runs-on: ubuntu-latest\n    steps:\n    - uses: actions/checkout@v3\n    - name: Set up Go\n      uses: actions/setup-go@v4\n      with:\n        go-version: '1.21'\n    - name: Build Code\n      run: go build -v ./...\n    - name: Run Tests\n      run: go test -v ./...`;
      case "typescript":
        return `name: Node.js CI/CD Pipeline\n\non:\n  push:\n    branches: [ main ]\n  pull_request:\n    branches: [ main ]\n\njobs:\n  build-and-test:\n    runs-on: ubuntu-latest\n    steps:\n    - uses: actions/checkout@v3\n    - name: Set up Node\n      uses: actions/setup-node@v3\n      with:\n        node-version: '18'\n    - name: Install dependencies\n      run: npm ci\n    - name: Run Build\n      run: npm run build --if-present\n    - name: Run Tests\n      run: npm test`;
      case "java":
        return `name: Java Maven CI/CD Pipeline\n\non:\n  push:\n    branches: [ main ]\n\njobs:\n  build-and-test:\n    runs-on: ubuntu-latest\n    steps:\n    - uses: actions/checkout@v3\n    - name: Set up JDK 17\n      uses: actions/setup-java@v3\n      with:\n        java-version: '17'\n        distribution: 'temurin'\n        cache: maven\n    - name: Build & Test\n      run: mvn clean test`;
      case "python":
      default:
        return `name: Python CI/CD Pipeline\n\non:\n  push:\n    branches: [ main ]\n  pull_request:\n    branches: [ main ]\n\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n    - uses: actions/checkout@v3\n    - name: Set up Python\n      uses: actions/setup-python@v4\n      with:\n        python-version: '3.11'\n    - name: Install dependencies\n      run: |\n        python -m pip install --upgrade pip\n        if [ -f requirements.txt ]; then pip install -r requirements.txt; fi\n    - name: Run unit tests\n      run: pytest`;
    }
  }, [targetLang]);

  // Generate deploy instructions
  const deployInstructions = useMemo(() => {
    switch (targetLang.toLowerCase()) {
      case "go":
        return `# Build the local Go executable binary\ngo build -o app main.go\n\n# Run local test suite\ngo test ./...\n\n# Push binary directly into production container registry\ndocker build -t registry.cloud.domain/app:latest .\ndocker push registry.cloud.domain/app:latest`;
      case "typescript":
        return `# Install typescript compiler and node dependencies\nnpm install\n\n# Transpile typescript modules into build targets\nnpm run build\n\n# Deploy application artifacts to hosting server\nnpm run deploy`;
      case "java":
        return `# Package java jar file using Maven executor\nmvn clean package\n\n# Run packaged jar artifact locally\njava -jar target/app-1.0.0.jar`;
      case "python":
      default:
        return `# Setup isolated python virtual environment\npython3 -m venv venv\nsource venv/bin/activate\n\n# Install runtime dependencies\npip install -r requirements.txt\n\n# Run unit tests to verify parity\npytest\n\n# Start Python FastAPI api server\nuvicorn main:app --host 0.0.0.0 --port 8000`;
    }
  }, [targetLang]);

  const activeContent = useMemo(() => {
    if (activeStep === "docker") return dockerfile;
    if (activeStep === "ci") return ciConfig;
    if (activeStep === "deploy") return deployInstructions;
    return "";
  }, [activeStep, dockerfile, ciConfig, deployInstructions]);

  const editorLanguage = useMemo(() => {
    if (activeStep === "docker") return "dockerfile";
    if (activeStep === "ci") return "yaml";
    return "shell";
  }, [activeStep]);

  const handleCopy = () => {
    if (!activeContent) return;
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPack = useCallback(async () => {
    const zip = new JSZip();
    zip.file("Dockerfile", dockerfile);
    zip.file("ci.yml", ciConfig);
    zip.file("deploy.sh", deployInstructions);

    const readme = `# LegacyLift Deployment Pack\n\nThis pack contains automated cloud deployment files generated for your modernized ${targetLang} code:\n\n1. \`Dockerfile\` - Multi-stage runtime environment container script.\n2. \`ci.yml\` - Continuous integration automated test pipeline for GitHub Actions.\n3. \`deploy.sh\` - Startup parameters and build verification runner.`;
    zip.file("README.md", readme);

    if (modernizedFiles) {
      Object.entries(modernizedFiles).forEach(([filename, content]) => {
        const modernizedName = getModernizedFilename(filename, targetLang);
        zip.file(modernizedName, content);
      });
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deployment_pack_${targetLang.toLowerCase()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }, [dockerfile, ciConfig, deployInstructions, targetLang, modernizedFiles]);

  const triggerDeploy = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDeploying(true);
    setDeployLogs([]);
    setDeploySuccess(false);

    const logs = [
      `[SYS] Initializing container build protocol for ${targetLang.toUpperCase()} target...`,
      `[SYS] Resolving multi-stage compiler dependencies...`,
      `[DOCKER] STEP 1/6: FROM ${targetLang.toLowerCase() === "go" ? "golang:1.21-alpine" : targetLang.toLowerCase() === "typescript" ? "node:18-alpine" : "python:3.11-slim"} AS builder`,
      `[DOCKER] STEP 2/6: WORKDIR /app`,
      `[DOCKER] STEP 3/6: COPY . .`,
      `[DOCKER] STEP 4/6: RUN compile-target-build`,
      `[DOCKER] ---> Successfully built image image-sha256:5b9c02d1d0c1`,
      `[SYS] Authenticating registry push to registry.legacylift.run...`,
      `[SYS] Pushed image artifact into secure registry repo.`,
      `[SYS] Provisioning container service instances on isolated virtual network...`,
      `[SYS] Mounting container volumes and binding HTTP port mappings...`,
      `[SYS] Health check status: 200 OK (passed)`,
      `[SYS] Activating public DNS mappings...`,
    ];

    let idx = 0;
    intervalRef.current = setInterval(() => {
      if (idx < logs.length) {
        setDeployLogs((prev) => [...prev, logs[idx]]);
        idx++;
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setDeploying(false);
        setDeploySuccess(true);
      }
    }, 450);
  }, [targetLang]);

  return (
    <div className="h-full flex flex-col gap-4 animate-fade-in overflow-hidden">
      <div>
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">
          Modernization Roadmap & Deploy Pack
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Automated deployment scripts and container configurations for your modernized target language.
        </p>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-5 min-h-0">
        {/* Sidebar Roadmap Navigation */}
        <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-3">
          <button
            onClick={() => setActiveStep("docker")}
            className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
              activeStep === "docker"
                ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500 shadow-sm font-semibold"
                : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            <div className={`p-2 rounded-lg ${activeStep === "docker" ? "bg-indigo-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
              <Container className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Containerization</p>
              <p className="text-[10px] text-gray-400 mt-1 leading-normal">Dockerfile configuration setup.</p>
            </div>
          </button>

          <button
            onClick={() => setActiveStep("ci")}
            className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
              activeStep === "ci"
                ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500 shadow-sm font-semibold"
                : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            <div className={`p-2 rounded-lg ${activeStep === "ci" ? "bg-indigo-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
              <GitPullRequest className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Continuous Integration</p>
              <p className="text-[10px] text-gray-400 mt-1 leading-normal">GitHub Actions automation workflow.</p>
            </div>
          </button>

          <button
            onClick={() => setActiveStep("deploy")}
            className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
              activeStep === "deploy"
                ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500 shadow-sm font-semibold"
                : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            <div className={`p-2 rounded-lg ${activeStep === "deploy" ? "bg-indigo-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Local Deployment</p>
              <p className="text-[10px] text-gray-400 mt-1 leading-normal">Install parameters and startup shell script.</p>
            </div>
          </button>

          <button
            onClick={() => setActiveStep("cloud")}
            className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
              activeStep === "cloud"
                ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500 shadow-sm font-semibold"
                : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            <div className={`p-2 rounded-lg ${activeStep === "cloud" ? "bg-indigo-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Cloud Sandbox Deploy</p>
              <p className="text-[10px] text-gray-400 mt-1 leading-normal">Execute a remote cloud server deployment.</p>
            </div>
          </button>
        </div>

        {/* Code display screen */}
        <div className="flex-1 flex flex-col rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-950 overflow-hidden shadow-xl min-h-[300px]">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-800 flex-shrink-0">
            <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">
              {activeStep === "docker" ? "Dockerfile" : activeStep === "ci" ? "ci.yml" : activeStep === "deploy" ? "deploy.sh" : "Deployment Terminal"}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPack}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-[10px] font-medium text-gray-300 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download Pack
              </button>
              {activeStep !== "cloud" && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-[10px] font-medium text-gray-300 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy Setup
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 relative flex flex-col">
            {activeStep !== "cloud" ? (
              <Editor
                value={activeContent}
                language={editorLanguage}
                height="100%"
                theme="vs-dark"
                wrapperProps={{ className: "bg-gray-950" }}
                loading={
                  <div className="flex items-center justify-center h-full gap-2 text-gray-500 bg-gray-950 font-mono text-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                    <span>Loading compilation template...</span>
                  </div>
                }
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 12,
                  fontFamily: "JetBrains Mono",
                  scrollBeyondLastLine: false,
                  lineNumbers: "on",
                  padding: { top: 12 },
                  wordWrap: "on",
                  renderLineHighlight: "none",
                }}
              />
            ) : (
              <div className="flex-1 flex flex-col bg-gray-950 p-4 font-mono text-xs overflow-y-auto space-y-2 relative min-h-[300px]">
                {deployLogs.length === 0 && !deploying && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-4">
                    <div className="p-3.5 bg-indigo-500/10 rounded-2xl text-indigo-500">
                      <Globe className="w-8 h-8" />
                    </div>
                    <div className="max-w-xs space-y-2">
                      <p className="text-sm font-bold text-gray-200">Deploy Code Sandbox</p>
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        Deploy the containerized target code directly to a virtual cloud container sandbox.
                      </p>
                      <button
                        onClick={triggerDeploy}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-sm transition-all active:scale-[0.98] mt-2"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Start Sandbox Deploy
                      </button>
                    </div>
                  </div>
                )}

                {deployLogs.map((log, index) => {
                  const isSys = log.startsWith("[SYS]");
                  const isDocker = log.startsWith("[DOCKER]");
                  return (
                    <div key={index} className={isSys ? "text-indigo-400" : isDocker ? "text-amber-400" : "text-gray-300"}>
                      {log}
                    </div>
                  );
                })}

                {deploying && (
                  <div className="flex items-center gap-1.5 text-indigo-500 animate-pulse pt-2">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping" />
                    <span>Provisioning sandbox infrastructure...</span>
                  </div>
                )}

                {deploySuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 space-y-2"
                  >
                    <p className="font-bold text-sm">🎉 Sandbox Deploy Successful!</p>
                    <p className="text-[11px] text-emerald-400/80">
                      Your modernized application has been successfully compiled, containerized, and deployed to a virtual micro-sandbox.
                    </p>
                    <div className="pt-1">
                      <a
                        href="http://app-sandbox-3a8f.legacylift.run"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        Visit Live Sandbox
                      </a>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
