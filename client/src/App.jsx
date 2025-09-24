import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  PlayCircle,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  User,
  Settings,
  AlertCircle,
  WifiOff,
  Wifi,
} from "lucide-react";

const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://your-backend-url.render.com" // Cambiar por tu URL real
    : "http://127.0.0.1:8000";

// Temas dinámicos
const themes = {
  express: {
    name: "City Express",
    primary: "from-blue-600 to-indigo-700",
    secondary: "from-blue-500 to-indigo-600",
    background: "from-blue-900 via-blue-800 to-indigo-900",
    accent: "blue",
    accentLight: "blue-300",
    accentDark: "blue-500",
    glass: "bg-blue-500/10",
    border: "border-blue-300/30",
    text: "text-blue-200",
    button:
      "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700",
    status: "bg-blue-500",
    progress: "from-blue-500 to-indigo-500",
    shadow: "shadow-blue-500/20",
  },
  junior: {
    name: "City Junior",
    primary: "from-green-600 to-emerald-700",
    secondary: "from-green-500 to-emerald-600",
    background: "from-green-900 via-emerald-800 to-teal-900",
    accent: "green",
    accentLight: "emerald-300",
    accentDark: "green-500",
    glass: "bg-green-500/10",
    border: "border-emerald-300/30",
    text: "text-emerald-200",
    button:
      "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700",
    status: "bg-green-500",
    progress: "from-green-500 to-emerald-500",
    shadow: "shadow-green-500/20",
  },
};

function App() {
  // Estados principales
  const [tipo, setTipo] = useState("express");
  const [afiliador, setAfiliador] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("checking");
  const [initialized, setInitialized] = useState(false);

  // Referencias
  const logsEndRef = useRef(null);
  const intervalRef = useRef(null);
  const logCountRef = useRef(0);

  // Tema actual
  const currentTheme = themes[tipo];

  // Forzar renderizado inicial
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialized(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll logs
  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [logs]);

  // Verificar conexión al backend con reintentos
  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 5;

    const checkConnection = async () => {
      if (!mounted) return;

      try {
        console.log(
          `Intento ${retryCount + 1}/${maxRetries} - Verificando conexión...`
        );

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(`${API_BASE_URL}/health`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!mounted) return;

        if (response.ok) {
          console.log("Backend conectado exitosamente");
          setConnectionStatus("connected");
          return;
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        if (!mounted) return;

        console.error("Error conectando:", error.message);

        if (retryCount < maxRetries - 1) {
          retryCount++;
          setTimeout(() => checkConnection(), 2000 * retryCount);
        } else {
          if (error.name === "AbortError") {
            setConnectionStatus("timeout");
            setError(
              "El servidor está tardando en responder. Puede estar iniciando..."
            );
          } else {
            setConnectionStatus("error");
            setError(`No se puede conectar: ${error.message}`);
          }
        }
      }
    };

    if (initialized) {
      checkConnection();
    }

    return () => {
      mounted = false;
    };
  }, [initialized]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleFileChange = (e) => {
    try {
      const file = e.target.files[0];
      if (!file) {
        setArchivo(null);
        return;
      }

      console.log("Archivo seleccionado:", file.name);

      if (file.size > 10 * 1024 * 1024) {
        setError("El archivo es demasiado grande. Máximo 10MB.");
        return;
      }

      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ];

      const isValidType =
        validTypes.includes(file.type) || file.name.match(/\.(xlsx|xls)$/i);

      if (!isValidType) {
        setError("Por favor selecciona un archivo Excel válido (.xlsx o .xls)");
        return;
      }

      setArchivo(file);
      setError(null);
    } catch (error) {
      console.error("Error manejando archivo:", error);
      setError("Error procesando el archivo");
    }
  };

  const agregarLog = (mensaje, tipo = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      id: logCountRef.current++,
      timestamp,
      mensaje,
      tipo,
    };

    setLogs((prev) => [...prev, logEntry]);
  };

  const consultarEstado = async (taskId) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${API_BASE_URL}/status/${taskId}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const status = await response.json();
      setTaskStatus(status);

      if (status.logs && Array.isArray(status.logs)) {
        const currentLogCount = logs.length;
        const newLogs = status.logs.slice(currentLogCount);

        newLogs.forEach((log) => {
          const cleanLog = log.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, "");
          let tipoLog = "info";

          if (cleanLog.includes("✅") || cleanLog.includes("ÉXITO"))
            tipoLog = "success";
          else if (cleanLog.includes("❌") || cleanLog.includes("ERROR"))
            tipoLog = "error";
          else if (cleanLog.includes("⚠️") || cleanLog.includes("WARNING"))
            tipoLog = "warning";

          agregarLog(cleanLog, tipoLog);
        });
      }

      if (status.status === "completed") {
        agregarLog(
          `Proceso completado! ${status.successful_records || 0} exitosos, ${
            status.error_records || 0
          } errores`,
          "success"
        );

        if (status.result_file_url) {
          const filename = status.result_file_url.split("/").pop();
          setDownloadUrl(`${API_BASE_URL}/download/${filename}`);
          agregarLog("Archivo de resultados listo para descarga", "success");
        }

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        setProcesando(false);
      } else if (status.status === "error") {
        const errorMsg = status.message || "Error desconocido";
        agregarLog(`Error en el proceso: ${errorMsg}`, "error");

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        setProcesando(false);
        setError(errorMsg);
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        agregarLog(`Error consultando estado: ${error.message}`, "error");
      }
    }
  };

  const procesarExcel = async () => {
    if (!archivo) {
      setError("Debes seleccionar un archivo Excel");
      return;
    }

    if (!afiliador.trim()) {
      setError("Debes ingresar el nombre del afiliador");
      return;
    }

    if (connectionStatus !== "connected") {
      setError("No hay conexión con el servidor");
      return;
    }

    setError(null);
    setLogs([]);
    setTaskStatus(null);
    setDownloadUrl(null);
    setProcesando(true);
    logCountRef.current = 0;

    const formData = new FormData();
    formData.append("archivo_excel", archivo);
    formData.append("tipo_afiliacion", tipo);
    formData.append("nombre_afiliador", afiliador.trim());

    try {
      agregarLog("Subiendo archivo y iniciando proceso...", "info");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${API_BASE_URL}/procesar`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = "Error al procesar archivo";
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          errorMessage = `Error HTTP ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data.task_id) {
        throw new Error("No se recibió ID de tarea");
      }

      setTaskId(data.task_id);
      agregarLog(`Proceso iniciado! Task ID: ${data.task_id}`, "success");

      if (data.total_records) {
        agregarLog(`Total de registros: ${data.total_records}`, "info");
      }

      if (data.estimated_time_minutes) {
        agregarLog(
          `Tiempo estimado: ${Math.ceil(data.estimated_time_minutes)} minutos`,
          "info"
        );
      }

      intervalRef.current = setInterval(() => {
        consultarEstado(data.task_id);
      }, 5000);

      setTimeout(() => consultarEstado(data.task_id), 3000);
    } catch (error) {
      let errorMsg;
      if (error.name === "AbortError") {
        errorMsg = "Timeout al enviar archivo";
      } else {
        errorMsg = `Error: ${error.message}`;
      }

      setError(errorMsg);
      setProcesando(false);
      agregarLog(errorMsg, "error");
    }
  };

  const detenerProceso = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setProcesando(false);
    agregarLog("Monitoreo detenido", "warning");
  };

  const limpiarLogs = () => {
    setLogs([]);
    logCountRef.current = 0;
  };

  const getLogIcon = (tipo) => {
    switch (tipo) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      default:
        return "📝";
    }
  };

  const getLogColor = (tipo) => {
    switch (tipo) {
      case "success":
        return "text-green-400";
      case "error":
        return "text-red-400";
      case "warning":
        return "text-yellow-400";
      default:
        return "text-gray-300";
    }
  };

  const getConnectionStatus = () => {
    switch (connectionStatus) {
      case "connected":
        return {
          icon: <Wifi className="w-4 h-4" />,
          text: "Conectado",
          color: "text-green-400",
        };
      case "error":
      case "timeout":
        return {
          icon: <WifiOff className="w-4 h-4" />,
          text: "Desconectado",
          color: "text-red-400",
        };
      default:
        return {
          icon: <Clock className="w-4 h-4 animate-spin" />,
          text: "Conectando...",
          color: "text-yellow-400",
        };
    }
  };

  // No renderizar hasta estar inicializado
  if (!initialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white">Cargando...</div>
      </div>
    );
  }

  const connectionInfo = getConnectionStatus();

  return (
    <div
      className={`min-h-screen bg-gradient-to-br ${currentTheme.background} transition-all duration-700 ease-in-out`}
    >
      <div className="container mx-auto px-4 py-8">
        {/* Header con Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <img
              src="/VLADWARE-removebg-preview.png"
              alt="VLADWARE"
              className="h-80 object-contain mr-4 drop-shadow-lg"
            />
            <div className="text-left">
              <h1 className="text-4xl font-bold text-white mb-1 drop-shadow-lg">
                Automatización Marriott Bonvoy
              </h1>
              <p className={`${currentTheme.text} text-lg font-medium`}>
                {currentTheme.name} - Procesamiento Automático
              </p>
            </div>
          </div>

          <p className={`${currentTheme.text} mb-4 text-lg`}>
            Sistema inteligente de afiliaciones desde archivos Excel
          </p>

          {/* Estado de conexión mejorado */}
          <div
            className={`inline-flex items-center gap-3 px-6 py-3 rounded-full backdrop-blur-lg ${currentTheme.glass} border ${currentTheme.border} ${connectionInfo.color} shadow-lg ${currentTheme.shadow}`}
          >
            <div className="flex items-center gap-2">
              {connectionInfo.icon}
              <span className="font-medium">{connectionInfo.text}</span>
            </div>
            {connectionStatus === "connected" && (
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            )}
          </div>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Panel de Control */}
          <div
            className={`backdrop-blur-lg rounded-3xl p-8 border ${currentTheme.border} ${currentTheme.glass} shadow-2xl ${currentTheme.shadow} transition-all duration-500`}
          >
            <div className="flex items-center mb-8">
              <div
                className={`p-3 rounded-2xl bg-gradient-to-br ${currentTheme.secondary} shadow-lg mr-4`}
              >
                <Settings className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Panel de Control
              </h2>
            </div>

            <div className="space-y-8">
              {/* Tipo de Afiliación con animación */}
              <div className="group">
                <label className="block text-sm font-semibold text-white mb-3">
                  Tipo de Afiliación
                </label>
                <select
                  className={`w-full backdrop-blur-lg ${currentTheme.glass} border-2 ${currentTheme.border} rounded-xl p-4 text-white text-lg font-medium focus:ring-4 focus:ring-${currentTheme.accent}-400/30 focus:border-${currentTheme.accentLight} transition-all duration-300 group-hover:shadow-lg`}
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  disabled={procesando}
                >
                  <option value="express" className="text-black bg-white">
                    🔷 City Express
                  </option>
                  <option value="junior" className="text-black bg-white">
                    🟢 City Junior 
                  </option>
                </select>
              </div>

              {/* Nombre del Afiliador */}
              <div className="group">
                <label className="block text-sm font-semibold text-white mb-3">
                  <div className="flex items-center">
                    <div
                      className={`p-2 rounded-lg bg-gradient-to-br ${currentTheme.secondary} mr-2`}
                    >
                      <User className="w-4 h-4 text-white" />
                    </div>
                    Nombre del Afiliador
                  </div>
                </label>
                <input
                  type="text"
                  className={`w-full backdrop-blur-lg ${currentTheme.glass} border-2 ${currentTheme.border} rounded-xl p-4 text-white placeholder-white/60 text-lg focus:ring-4 focus:ring-${currentTheme.accent}-400/30 focus:border-${currentTheme.accentLight} transition-all duration-300 group-hover:shadow-lg`}
                  placeholder="Ingresa tu nombre completo"
                  value={afiliador}
                  onChange={(e) => setAfiliador(e.target.value)}
                  disabled={procesando}
                />
              </div>

              {/* Archivo Excel */}
              <div className="group">
                <label className="block text-sm font-semibold text-white mb-3">
                  <div className="flex items-center">
                    <div
                      className={`p-2 rounded-lg bg-gradient-to-br ${currentTheme.secondary} mr-2`}
                    >
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    Archivo Excel (.xlsx, .xls)
                  </div>
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    disabled={procesando}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className={`flex items-center justify-center w-full p-6 border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer group-hover:scale-105 ${
                      procesando
                        ? "border-white/20 cursor-not-allowed"
                        : `${currentTheme.border} hover:border-${currentTheme.accentLight} hover:shadow-xl ${currentTheme.shadow}`
                    }`}
                  >
                    <div className="text-center">
                      <div
                        className={`mx-auto mb-3 p-3 rounded-2xl bg-gradient-to-br ${currentTheme.secondary}`}
                      >
                        <Upload className="w-8 h-8 text-white" />
                      </div>
                      <span className="text-white text-lg font-medium block">
                        {archivo ? archivo.name : "Seleccionar archivo Excel"}
                      </span>
                      <span
                        className={`${currentTheme.text} text-sm block mt-2`}
                      >
                        Arrastra y suelta o haz click para seleccionar
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-500/20 border-2 border-red-500/50 rounded-xl p-4 backdrop-blur-lg animate-pulse">
                  <div className="flex items-center">
                    <AlertCircle className="w-6 h-6 text-red-400 mr-3 flex-shrink-0" />
                    <span className="text-red-200 font-medium">{error}</span>
                  </div>
                </div>
              )}

              {/* Botones */}
              <div className="flex space-x-4">
                <button
                  onClick={procesarExcel}
                  disabled={
                    procesando ||
                    !archivo ||
                    !afiliador.trim() ||
                    connectionStatus !== "connected"
                  }
                  className={`flex-1 ${currentTheme.button} text-white py-4 px-8 rounded-xl font-bold text-lg hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center transform hover:scale-105 ${currentTheme.shadow}`}
                >
                  {procesando ? (
                    <>
                      <Clock className="w-5 h-5 mr-3 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-5 h-5 mr-3" />
                      Iniciar Proceso
                    </>
                  )}
                </button>

                {procesando && (
                  <button
                    onClick={detenerProceso}
                    className="bg-red-500 hover:bg-red-600 text-white py-4 px-6 rounded-xl font-bold transition-all duration-300 hover:shadow-xl transform hover:scale-105"
                  >
                    Detener
                  </button>
                )}
              </div>

              {/* Estado del Proceso */}
              {taskStatus && (
                <div
                  className={`backdrop-blur-lg ${currentTheme.glass} rounded-2xl p-6 space-y-4 border ${currentTheme.border} shadow-xl`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold text-lg">
                      Estado del Proceso
                    </span>
                    <span
                      className={`px-4 py-2 rounded-full text-sm font-bold ${
                        taskStatus.status === "completed"
                          ? "bg-green-500 text-white"
                          : taskStatus.status === "error"
                          ? "bg-red-500 text-white"
                          : taskStatus.status === "processing"
                          ? `${currentTheme.status} text-white`
                          : "bg-yellow-500 text-black"
                      } shadow-lg`}
                    >
                      {taskStatus.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Barra de Progreso mejorada */}
                  {taskStatus.progress !== undefined && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-white">
                        <span>Progreso</span>
                        <span className="font-bold">
                          {taskStatus.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                        <div
                          className={`bg-gradient-to-r ${currentTheme.progress} h-3 rounded-full transition-all duration-500 ease-out shadow-lg`}
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(100, taskStatus.progress)
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Estadísticas */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-white/10 rounded-xl">
                      <div className="text-white/70 text-sm">Procesados</div>
                      <div className="text-white font-bold text-xl">
                        {taskStatus.processed_records || 0}/
                        {taskStatus.total_records || 0}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-white/10 rounded-xl">
                      <div className="text-white/70 text-sm">Exitosos</div>
                      <div className="text-green-400 font-bold text-xl">
                        {taskStatus.successful_records || 0}
                      </div>
                    </div>
                  </div>

                  {taskStatus.current_processing &&
                    taskStatus.status === "processing" && (
                      <div className="text-center p-3 bg-white/10 rounded-xl">
                        <div className="text-white/70 text-sm">Procesando</div>
                        <div className="text-white font-medium">
                          {taskStatus.current_processing}
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* Descarga */}
              {downloadUrl && (
                <div className="text-center">
                  <a
                    href={downloadUrl}
                    className="inline-flex items-center bg-green-500 hover:bg-green-600 text-white py-4 px-8 rounded-xl font-bold text-lg transition-all duration-300 hover:shadow-2xl transform hover:scale-105 shadow-green-500/20"
                    download
                  >
                    <Download className="w-5 h-5 mr-3" />
                    Descargar Resultados
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Panel de Logs */}
          <div
            className={`backdrop-blur-lg rounded-3xl p-8 border ${currentTheme.border} ${currentTheme.glass} shadow-2xl ${currentTheme.shadow} transition-all duration-500`}
          >
            <div className="flex items-center mb-6">
              <div
                className={`p-3 rounded-2xl bg-gradient-to-br ${currentTheme.secondary} shadow-lg mr-4`}
              >
                <FileText className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Logs en Tiempo Real
              </h2>
              {logs.length > 0 && (
                <>
                  <span className="ml-auto bg-white/20 text-white text-sm font-bold px-3 py-1 rounded-full mr-3 shadow-lg">
                    {logs.length}
                  </span>
                  <button
                    onClick={limpiarLogs}
                    className="text-white/70 hover:text-white text-sm font-medium transition-colors"
                    disabled={procesando}
                  >
                    Limpiar
                  </button>
                </>
              )}
            </div>

            <div className="bg-gray-900/70 rounded-2xl h-96 overflow-y-auto p-4 font-mono text-sm backdrop-blur-lg border border-white/10 shadow-inner">
              {logs.length === 0 ? (
                <div className="text-gray-400 text-center py-12">
                  <div className="text-6xl mb-4">📝</div>
                  <div className="text-lg font-medium">
                    Los logs aparecerán aquí
                  </div>
                  <div className="text-sm">durante el procesamiento...</div>
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="mb-2 flex items-start space-x-3 hover:bg-white/5 p-2 rounded-lg transition-colors"
                  >
                    <span className="text-gray-500 text-xs mt-1 flex-shrink-0 font-bold">
                      {log.timestamp}
                    </span>
                    <span className="flex-shrink-0 text-lg">
                      {getLogIcon(log.tipo)}
                    </span>
                    <span
                      className={`${getLogColor(
                        log.tipo
                      )} break-words font-medium leading-relaxed`}
                    >
                      {log.mensaje}
                    </span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
