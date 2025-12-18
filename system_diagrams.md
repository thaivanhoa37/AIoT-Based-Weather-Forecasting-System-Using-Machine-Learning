# 📊 Sơ Đồ Hệ Thống - AIoT Weather Forecasting

> Tài liệu sơ đồ kỹ thuật cho báo cáo - Đã tối ưu cho in ấn

**Hướng dẫn xem**: Nhấn `Ctrl + Shift + V` trong VS Code | Xuất ảnh: [Mermaid Live](https://mermaid.live/)

---

## 1. Sơ Đồ Khối Hệ Thống

```mermaid
%%{init: {'theme':'base', 'themeVariables': {'fontSize':'12px'}, 'flowchart':{'curve':'basis', 'padding':15}}}%%
graph TD
    %% Layer 1: IoT Sensors
    subgraph IOT["🔵 Lớp Cảm Biến IoT"]
        direction LR
        N1["Node LoRa 1<br/>BME280 + MQ-135"]
        N2["Node LoRa 2<br/>BME280 + MQ-135"]
    end

    %% Layer 2: Communication
    subgraph COMM["🟠 Lớp Truyền Thông"]
        direction LR
        GW["Gateway<br/>ESP32 + LoRa SX1278"]
        MQTT["MQTT Broker<br/>Port 1883"]
    end

    %% Layer 3: Data Processing
    subgraph DATA["🟣 Lớp Xử Lý Dữ Liệu"]
        direction LR
        NR["Node-RED<br/>Flow Processing"]
        DB[("MySQL<br/>Database")]
    end

    %% Layer 4: Application
    subgraph APP["🟢 Lớp Ứng Dụng & ML"]
        direction LR
        WEB["FastAPI Server<br/>Port 8000"]
        ML["ML Manager<br/>Prophet + LightGBM"]
        SCHED["Auto Scheduler"]
    end

    %% Layer 5: Presentation
    subgraph UI["🔴 Lớp Giao Diện"]
        direction LR
        DASH["Dashboard<br/>Real-time"]
        FORE["Forecast<br/>24h & 7-day"]
        MGMT["MySQL Manager<br/>Export/Backup"]
    end

    %% External
    API["🌤️ Weather API<br/>OpenWeatherMap"]

    %% Connections
    N1 & N2 -.->|LoRa 433MHz| GW
    GW -->|MQTT Publish| MQTT
    MQTT -->|Subscribe| NR
    API -.->|HTTP| NR
    NR -->|Insert| DB
    DB <-->|SQLAlchemy| WEB
    WEB --> ML
    WEB --> SCHED
    ML -.->|Save Models| DB
    SCHED -.->|Trigger| ML
    ML -->|Predictions| FORE
    DB -.->|Data| DASH
    WEB --> MGMT
    
    %% Styling
    classDef iot fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef comm fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef app fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef ui fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef api fill:#fffde7,stroke:#f57f17,stroke-width:2px
    
    class N1,N2 iot
    class GW,MQTT comm
    class NR,DB data
    class WEB,ML,SCHED app
    class DASH,FORE,MGMT ui
    class API api
```

---

## 2. Lưu Đồ Thuật Toán Hệ Thống

```mermaid
flowchart TD
    START([Khởi Động]) --> INIT[Init System]
    INIT --> SPLIT{4 Luồng}
    
    SPLIT -->|IoT| S1[Cảm Biến]
    S1 --> L1[LoRa] --> G1[Gateway]
    G1 --> M1[MQTT] --> N1[Node-RED]
    N1 --> V1{Valid?}
    V1 -->|Yes| D1[(DB)]
    V1 -->|No| E1[Error] --> S1
    D1 --> S1
    
    SPLIT -->|API| A1[Weather API]
    A1 --> P1[Parse] --> D2[(DB)]
    D2 --> A1
    
    SPLIT -->|ML| C1{Schedule?}
    C1 -->|Yes| F1[Fetch Data]
    F1 --> T1[Train] --> S2[Save]
    S2 --> C1
    C1 -->|No| W1[Wait] --> C1
    
    SPLIT -->|Web| R1{Request}
    R1 -->|Dashboard| Q1[Query] --> R2[Response] --> R1
    R1 -->|Forecast| PR[Predict] --> R3[Response] --> R1
    R1 -->|Export| EX[Export] --> R4[Response] --> R1
    
    classDef start fill:#4caf50,stroke:#1b5e20,stroke-width:2px,color:#fff
    classDef proc fill:#2196f3,stroke:#0d47a1,stroke-width:2px,color:#fff
    classDef dec fill:#ff9800,stroke:#e65100,stroke-width:2px,color:#fff
    classDef db fill:#9c27b0,stroke:#4a148c,stroke-width:2px,color:#fff
    
    class START start
    class INIT,S1,L1,G1,M1,N1,A1,P1,F1,T1,S2,Q1,PR,EX proc
    class SPLIT,V1,C1,R1 dec
    class D1,D2 db
```

---

## 3. Lưu Đồ ML Training

```mermaid
flowchart TD
    START([Start]) --> TRIG{Trigger}
    TRIG -->|Auto| AUTO[Scheduler]
    TRIG -->|Manual| MAN[User]
    AUTO & MAN --> LOAD[Load Config]
    
    LOAD --> CHECK{Enough Data?}
    CHECK -->|No| FAIL([Fail])
    CHECK -->|Yes| PREP[Preprocess]
    
    PREP --> MODEL{Model Type}
    MODEL -->|Prophet| TP[Train Prophet]
    MODEL -->|LightGBM| TL[Train LightGBM]
    
    TP & TL --> EVAL[Evaluate]
    EVAL --> QUAL{Quality OK?}
    QUAL -->|No| RETRY[Adjust] --> MODEL
    QUAL -->|Yes| SAVE[Save Model]
    SAVE --> SUCCESS([Success])
    
    classDef start fill:#4caf50,stroke:#1b5e20,stroke-width:2px,color:#fff
    classDef proc fill:#2196f3,stroke:#0d47a1,stroke-width:2px,color:#fff
    classDef dec fill:#ff9800,stroke:#e65100,stroke-width:2px,color:#fff
    
    class START,SUCCESS,FAIL start
    class AUTO,MAN,LOAD,PREP,TP,TL,EVAL,RETRY,SAVE proc
    class TRIG,CHECK,MODEL,QUAL dec
```

---

## 4. Sequence Diagram - Thu Thập Dữ Liệu

```mermaid
sequenceDiagram
    participant S as Sensor
    participant G as Gateway
    participant M as MQTT
    participant N as Node-RED
    participant D as Database
    participant W as FastAPI
    participant U as User
    
    rect rgb(225, 245, 255)
        Note over S,N: IoT Data Collection
        loop Every 30s
            S->>S: Read Sensors
            S->>G: LoRa TX
        end
        G->>M: MQTT Publish
        M->>N: Subscribe
        N->>D: INSERT
    end
    
    rect rgb(252, 228, 236)
        Note over U,W: Dashboard
        U->>W: GET /
        W->>D: SELECT
        D-->>W: Data
        W-->>U: HTML + JSON
    end
    
    rect rgb(232, 245, 233)
        Note over W,D: ML Training
        U->>W: POST /train
        W->>D: SELECT Data
        D-->>W: Records
        W->>W: Train Model
        W->>D: Save Model
        W-->>U: Results
    end
    
    rect rgb(255, 249, 196)
        Note over U,W: Forecast
        U->>W: GET /forecast
        W->>W: Load Model
        W->>W: Predict
        W-->>U: Predictions
    end
```

---

## 5. Sequence Diagram - ML Prediction

```mermaid
sequenceDiagram
    participant U as User
    participant W as Web
    participant M as ML Manager
    participant P as Prophet/LightGBM
    participant D as Database
    participant S as Storage
    
    U->>W: GET /forecast?hours=24
    W->>M: predict(24)
    
    M->>M: Load current_model.json
    M->>S: Load model files
    S-->>M: Model object
    
    M->>D: SELECT latest data
    D-->>M: Historical data
    
    M->>P: Initialize model
    P->>P: Prepare features
    P->>P: Generate predictions
    P-->>M: Predictions
    
    M->>M: Post-process
    M-->>W: Results JSON
    W-->>U: Render forecast
```

---

## 6. Component Interaction

```mermaid
%%{init: {'theme':'base', 'flowchart':{'curve':'linear'}}}%%
graph LR
    subgraph HW[Hardware]
        S1[Sensor 1]
        S2[Sensor 2]
        GW[Gateway]
    end
    
    subgraph MW[Middleware]
        MQ[MQTT]
        NR[Node-RED]
    end
    
    subgraph DL[Data]
        DB[(MySQL)]
    end
    
    subgraph AL[Application]
        API[FastAPI]
        ML[ML Manager]
    end
    
    subgraph ML_LAYER[Models]
        P[Prophet]
        L[LightGBM]
    end
    
    subgraph PL[Presentation]
        UI[Web UI]
        REST[REST API]
    end
    
    S1 & S2 ---|LoRa| GW
    GW ---|MQTT| MQ
    MQ --> NR --> DB
    DB <--> API
    API --> ML & UI & REST
    ML --> P & L
    
    classDef hw fill:#ffccbc,stroke:#d84315
    classDef mw fill:#c5cae9,stroke:#3949ab
    classDef dl fill:#b2dfdb,stroke:#00695c
    classDef al fill:#fff9c4,stroke:#f57f17
    classDef ml fill:#d1c4e9,stroke:#512da8
    classDef pl fill:#f8bbd0,stroke:#c2185b
    
    class S1,S2,GW hw
    class MQ,NR mw
    class DB dl
    class API,ML al
    class P,L ml
    class UI,REST pl
```

---

## Thông Số Kỹ Thuật

### Cảm Biến

| Cảm Biến | Đo Lường | Độ Chính Xác |
|----------|----------|--------------|
| BME280 | Nhiệt độ, Độ ẩm, Áp suất | ±1°C, ±3%RH, ±1hPa |
| MQ-135 | Chất lượng không khí | Định tính |
| GP2Y1010AU0F | Bụi PM2.5 | ±10% |

### Truyền Thông

- **LoRa**: 433MHz, SF7-12, BW 125kHz
- **MQTT**: QoS 1, Port 1883
- **HTTP**: REST API, JSON

### ML Hyperparameters

**Prophet**: changepoint_prior_scale=0.05, seasonality_prior_scale=10.0  
**LightGBM**: num_leaves=31, learning_rate=0.05, n_estimators=100

---

**Tài liệu tham khảo**: [README.md](file:///G:/DATN/AIoT-Based-Weather-Forecasting-System-Using-Machine-Learning/README.md) | [main.py](file:///G:/DATN/AIoT-Based-Weather-Forecasting-System-Using-Machine-Learning/src/AIoT-Based Weather Forecasting System Using Machine Learning/python-web/main.py)
