// ===== Internationalization (i18n) System =====

const translations = {
    vi: {
        // Navigation
        nav: {
            overview: 'Tổng quan',
            charts: 'Biểu đồ & Phân tích',
            forecast: 'Dự báo (ML)',
            mlTraining: 'Huấn luyện ML',
            mysql: 'Quản lý dữ liệu MySQL',
            settings: 'Cấu hình hệ thống'
        },
        // Common
        common: {
            loading: 'Đang tải...',
            refresh: 'Cập nhật dữ liệu',
            save: 'Lưu',
            cancel: 'Hủy',
            confirm: 'Xác nhận',
            delete: 'Xóa',
            export: 'Xuất',
            import: 'Nhập',
            apply: 'Áp dụng',
            reset: 'Đặt lại',
            search: 'Tìm kiếm',
            filter: 'Bộ lọc',
            all: 'Tất cả',
            today: 'Hôm nay',
            previous: 'Trước',
            next: 'Sau',
            page: 'Trang',
            warning: 'Cảnh báo',
            error: 'Lỗi',
            success: 'Thành công',
            active: 'Hoạt động',
            inactive: 'Không hoạt động'
        },
        // Index/Overview page
        index: {
            pageTitle: 'Tổng quan thời tiết',
            currentWeather: 'Thời tiết hiện tại',
            humidity: 'Độ ẩm',
            wind: 'Gió',
            pressure: 'Áp suất',
            location: 'Quận 9, TP.HCM',
            lastUpdate: 'Cập nhật lúc',
            iotSensorData: 'Dữ liệu cảm biến IoT (Thời gian thực)',
            temperature: 'Nhiệt độ',
            co2: 'CO₂',
            dust: 'Bụi mịn',
            weatherApiData: 'Dữ liệu từ API Thời tiết',
            windSpeed: 'Tốc độ gió',
            rainfall: 'Lượng mưa',
            uvIndex: 'Chỉ số UV',
            forecast7Days: 'Dự báo 7 ngày (ML Model)',
            forecast7DaysDesc: 'Dự báo thời tiết từ model Prophet đã huấn luyện',
            forecastHourly: 'Dự báo theo giờ - 24 giờ (ML Model)',
            forecastHourlyDesc: 'Dự báo chi tiết từng giờ trong 24 giờ tới từ model ML',
            systemStatus: 'Trạng thái hệ thống',
            activeSensors: 'Cảm biến hoạt động',
            quantity: 'Số lượng',
            dataRecords: 'Bản ghi dữ liệu',
            todayRecords: 'Hôm nay',
            lastUpdateTime: 'Cập nhật lần cuối',
            time: 'Thời gian',
            status: 'Trạng thái',
            system: 'Hệ thống'
        },
        // Charts page
        charts: {
            pageTitle: 'Biểu đồ & Phân tích',
            dataFilter: 'Bộ lọc dữ liệu',
            quickTimeRange: 'Khoảng thời gian nhanh',
            last24h: '24 giờ qua',
            last7d: '7 ngày qua',
            last30d: '30 ngày qua',
            custom: 'Tùy chỉnh',
            fromDate: 'Từ ngày & giờ',
            toDate: 'Đến ngày & giờ',
            node: 'Node',
            granularity: 'Độ chi tiết hiển thị',
            byHour: 'Theo giờ (chi tiết)',
            byDay: 'Theo ngày',
            byWeek: 'Theo tuần',
            applyFilter: 'Áp dụng bộ lọc',
            resetFilter: 'Đặt lại',
            timeRangeViewing: 'Khoảng thời gian đang xem:',
            allSensors: 'Tất cả cảm biến - Xem chi tiết',
            allSensorsDesc: 'Hiển thị tất cả dữ liệu cảm biến IoT và API thời tiết trong một giao diện thống nhất',
            statistics: 'Thống kê tổng hợp'
        },
        // Forecast page
        forecast: {
            pageTitle: 'Dự báo thời tiết (ML)',
            modelInfo: 'Thông tin Model',
            currentModel: 'Model hiện tại',
            trainedOn: 'Đã huấn luyện',
            accuracy: 'Độ chính xác',
            forecastSummary: 'Tóm tắt dự báo',
            hourlyForecast: 'Dự báo theo giờ (24h)',
            dailyForecast: 'Dự báo theo ngày (7 ngày)',
            confidence: 'Độ tin cậy',
            rainProbability: 'Xác suất mưa',
            rain: 'Có mưa',
            noRain: 'Không mưa'
        },
        // ML Training page
        mlTraining: {
            pageTitle: 'Huấn luyện Model ML',
            heroTitle: 'Trung tâm Huấn luyện Machine Learning',
            heroDesc: 'Huấn luyện và quản lý các model dự báo thời tiết sử dụng dữ liệu IoT thực tế',
            dataPoints: 'Điểm dữ liệu',
            modelsAvailable: 'Model có sẵn',
            lastTraining: 'Lần huấn luyện gần nhất',
            avgAccuracy: 'Độ chính xác TB',
            trainingConfig: 'Cấu hình huấn luyện',
            selectModel: 'Chọn model',
            trainingDays: 'Số ngày dữ liệu',
            startTraining: 'Bắt đầu huấn luyện',
            stopTraining: 'Dừng huấn luyện',
            trainingProgress: 'Tiến trình huấn luyện',
            steps: {
                loadData: 'Tải dữ liệu',
                preprocess: 'Tiền xử lý',
                train: 'Huấn luyện',
                validate: 'Xác thực',
                save: 'Lưu model'
            },
            results: 'Kết quả huấn luyện',
            trainingHistory: 'Lịch sử huấn luyện'
        },
        // MySQL page
        mysql: {
            pageTitle: 'Quản lý dữ liệu MySQL',
            dbOverview: 'Tổng quan cơ sở dữ liệu',
            totalRecords: 'Tổng số bản ghi',
            storageSize: 'Dung lượng ước tính',
            latestRecord: 'Bản ghi mới nhất',
            filterSearch: 'Bộ lọc & Tìm kiếm',
            timeRange: 'Khoảng thời gian',
            searchPlaceholder: 'Nhập ID hoặc thời gian...',
            refreshData: 'Làm mới dữ liệu',
            dataTable: 'Bảng dữ liệu',
            tableHeaders: {
                id: 'ID',
                time: 'Thời gian',
                node: 'Node',
                temperature: 'Nhiệt độ (°C)',
                humidity: 'Độ ẩm (%)',
                pressure: 'Áp suất (hPa)',
                co2: 'CO₂ (ppm)',
                dust: 'Bụi mịn (µg/m³)',
                aqi: 'AQI'
            },
            tools: 'Công cụ quản lý dữ liệu',
            exportData: 'Xuất dữ liệu',
            exportDesc: 'Xuất dữ liệu sang CSV, JSON hoặc Excel',
            backup: 'Sao lưu',
            backupDesc: 'Tạo bản sao lưu cơ sở dữ liệu',
            optimize: 'Tối ưu hóa',
            optimizeDesc: 'Tối ưu hóa bảng và index',
            viewStats: 'Xem',
            statsDesc: 'Xem thống kê chi tiết',
            dataCleanup: 'Dọn dẹp dữ liệu',
            cleanupWarning: 'Việc xóa dữ liệu cũ sẽ giúp giảm dung lượng cơ sở dữ liệu. Tuy nhiên, dữ liệu đã xóa không thể khôi phục được.',
            selectDeleteRange: 'Chọn khoảng thời gian cần xóa',
            fromDate: 'Từ ngày',
            toDate: 'Đến ngày',
            lastWeek: 'Tuần trước',
            lastMonth: 'Tháng trước',
            last3Months: '3 tháng trước',
            olderThan7Days: 'Cũ hơn 7 ngày',
            olderThan30Days: 'Cũ hơn 30 ngày',
            deleteByRange: 'Xóa theo khoảng thời gian',
            deleteAll: 'Xóa tất cả dữ liệu',
            confirmDelete: 'Xác nhận xóa dữ liệu',
            confirmDeleteMsg: 'Bạn có chắc chắn muốn xóa dữ liệu cũ không?'
        },
        // Settings page
        settings: {
            pageTitle: 'Cấu hình hệ thống',
            bannerTitle: 'Cấu hình hệ thống',
            bannerDesc: 'Quản lý tất cả cài đặt của hệ thống AIoT Weather',
            mqttConfig: 'Cấu hình MQTT',
            mqttBroker: 'MQTT Broker',
            mqttPort: 'Port',
            mqttUser: 'Username',
            mqttPass: 'Password',
            mqttTopic: 'Topic',
            dbConfig: 'Cấu hình Database',
            dbHost: 'Host',
            dbPort: 'Port',
            dbUser: 'Username',
            dbPass: 'Password',
            dbName: 'Database Name',
            weatherApiConfig: 'Cấu hình Weather API',
            apiKey: 'API Key',
            apiLocation: 'Vị trí',
            systemConfig: 'Cấu hình hệ thống',
            updateInterval: 'Khoảng thời gian cập nhật (giây)',
            dataRetention: 'Thời gian lưu trữ dữ liệu (ngày)',
            autoBackup: 'Tự động sao lưu',
            testConnection: 'Kiểm tra kết nối',
            saveSettings: 'Lưu cấu hình'
        },
        // Weather descriptions
        weather: {
            sunny: 'Nắng đẹp',
            cloudy: 'Có mây',
            rainy: 'Có mưa',
            stormy: 'Bão',
            foggy: 'Sương mù',
            windy: 'Gió mạnh',
            hot: 'Nóng',
            cold: 'Lạnh',
            humid: 'Ẩm ướt'
        },
        // Extended Forecast page
        forecastExt: {
            loadingForecast: 'Đang tải dự báo...',
            pleaseWait: 'Vui lòng chờ trong giây lát',
            forecast24h: 'Dự báo 24 giờ tới',
            refreshBtn: 'Làm mới',
            forecastDetail: 'Chi tiết dự báo',
            tableTime: 'Thời gian',
            tableTemp: 'Nhiệt độ (°C)',
            tableHumidity: 'Độ ẩm (%)',
            tablePressure: 'Áp suất (mb)',
            tableAqi: 'AQI',
            tableRain: 'Mưa?',
            tableConfidence: 'Tin cậy (%)',
            forecastStats: 'Thống kê dự báo',
            avgTemp: 'Nhiệt độ TB',
            avgHumidity: 'Độ ẩm TB',
            rainProb: 'Xác suất mưa',
            maxTemp: 'Nhiệt độ cao',
            minTemp: 'Nhiệt độ thấp',
            modelInfo: 'Thông tin Model ML',
            modelUsing: 'Model đang sử dụng',
            modelStatusLabel: 'Trạng thái',
            lastTrained: 'Lần train gần nhất',
            accuracyLabel: 'Độ chính xác',
            trainedModels: 'Models đã train',
            notLoaded: 'Chưa tải'
        },
        // Extended ML Training page
        mlTrainingExt: {
            heroTitle: 'Huấn luyện Model Dự báo',
            heroDesc: 'Sử dụng Machine Learning để dự báo chính xác thời tiết từ dữ liệu cảm biến IoT',
            currentInfo: 'Thông tin hiện tại',
            model: 'Model',
            lastTrain: 'Huấn luyện gần nhất',
            r2Score: 'R² Score',
            dataLabel: 'Dữ liệu',
            configStart: 'Cấu hình & Bắt đầu',
            selectModel: 'Chọn Model',
            prophetRecommend: 'Prophet (Khuyến nghị)',
            lstmDeep: 'LSTM (Deep Learning)',
            dataAmount: 'Số lượng dữ liệu',
            targetVar: 'Biến dự báo',
            targetAll: 'Tất cả (nhiệt độ, độ ẩm, AQI, áp suất)',
            trainTestRatio: 'Tỷ lệ Train/Test',
            ratioDefault: '80/20 (Mặc định)',
            startTraining: 'Bắt đầu huấn luyện',
            stopTraining: 'Dừng huấn luyện',
            trainingProgress: 'Tiến trình huấn luyện',
            step: 'Bước',
            trainingStatus: 'Trạng thái huấn luyện',
            logs: 'Logs',
            results: 'Kết quả huấn luyện',
            autoScheduler: 'Lập lịch tự động huấn luyện',
            autoTrainEnabled: 'Tự động huấn luyện đã bật',
            autoTrainDisabled: 'Tự động huấn luyện đã tắt',
            enableAutoTrain: 'Bật tự động',
            disableAutoTrain: 'Tắt tự động',
            trainNow: 'Huấn luyện ngay',
            history: 'Lịch sử huấn luyện',
            modelComparison: 'So sánh Model',
            noHistory: 'Chưa có lịch sử huấn luyện',
            trainFirstModel: 'Hãy huấn luyện model đầu tiên!'
        },
        // Extended MySQL page
        mysqlExt: {
            dbOverview: 'Tổng quan cơ sở dữ liệu',
            totalRecords: 'Tổng số bản ghi',
            estSize: 'Dung lượng ước tính',
            latestRecord: 'Bản ghi mới nhất',
            filterSearch: 'Bộ lọc & Tìm kiếm',
            timeRange: 'Khoảng thời gian',
            today: 'Hôm nay',
            last24h: '24 giờ qua',
            last7d: '7 ngày qua',
            all: 'Tất cả',
            node: 'Node',
            allNodes: 'Tất cả',
            searchLabel: 'Tìm kiếm (ID hoặc thời gian)',
            searchPlaceholder: 'Nhập ID hoặc thời gian...',
            refreshData: 'Làm mới dữ liệu',
            dataTable: 'Bảng dữ liệu',
            thId: 'ID',
            thTime: 'Thời gian',
            thNode: 'Node',
            thTemp: 'Nhiệt độ (°C)',
            thHumidity: 'Độ ẩm (%)',
            thPressure: 'Áp suất (hPa)',
            thCo2: 'CO₂ (ppm)',
            thDust: 'Bụi mịn (µg/m³)',
            thAqi: 'AQI',
            prev: '← Trước',
            next: 'Sau →',
            page: 'Trang',
            tools: 'Công cụ quản lý dữ liệu',
            exportData: 'Xuất dữ liệu',
            exportDesc: 'Xuất dữ liệu sang CSV, JSON hoặc Excel',
            exportBtn: 'Xuất',
            backup: 'Sao lưu',
            backupDesc: 'Tạo bản sao lưu cơ sở dữ liệu',
            backupBtn: 'Sao lưu',
            optimize: 'Tối ưu hóa',
            optimizeDesc: 'Tối ưu hóa bảng và index',
            optimizeBtn: 'Tối ưu',
            stats: 'Thống kê',
            statsDesc: 'Xem thống kê chi tiết',
            viewBtn: 'Xem',
            dataCleanup: 'Dọn dẹp dữ liệu',
            cleanupWarning: 'Việc xóa dữ liệu cũ sẽ giúp giảm dung lượng cơ sở dữ liệu. Tuy nhiên, dữ liệu đã xóa không thể khôi phục được.',
            selectDeleteRange: 'Chọn khoảng thời gian cần xóa',
            fromDate: 'Từ ngày',
            toDate: 'Đến ngày',
            lastWeek: 'Tuần trước',
            lastMonth: 'Tháng trước',
            last3Months: '3 tháng trước',
            older7Days: 'Cũ hơn 7 ngày',
            older30Days: 'Cũ hơn 30 ngày',
            selectRangeHint: 'Chọn khoảng thời gian để xem số bản ghi sẽ bị xóa',
            deleteByRange: 'Xóa theo khoảng thời gian',
            deleteAll: 'Xóa tất cả dữ liệu',
            confirmDelete: 'Xác nhận xóa dữ liệu',
            confirmDeleteMsg: 'Bạn có chắc chắn muốn xóa dữ liệu cũ không?',
            cancel: 'Hủy',
            confirm: 'Xác nhận'
        },
        // Extended Settings page
        settingsExt: {
            bannerTitle: 'Cấu hình hệ thống AIoT',
            bannerDesc: 'Quản lý thiết bị, kết nối, vị trí, và các tham số hệ thống',
            rpiStats: 'Thông số Raspberry Pi',
            rpiSubtitle: 'RAM, CPU, GPU & Nhiệt độ',
            cpuUsage: 'CPU Usage',
            cores: 'Cores',
            freq: 'Freq',
            memory: 'Memory (RAM)',
            used: 'Used',
            total: 'Total',
            gpuMemory: 'GPU Memory',
            allocated: 'Allocated',
            cpuTemp: 'CPU Temperature',
            tempStatus: 'Status',
            tempGood: 'Bình thường',
            tempWarm: 'Hơi nóng',
            tempHot: 'Nóng',
            storage: 'Storage',
            free: 'Free',
            uptime: 'System Uptime',
            bootTime: 'Boot time',
            systemControl: 'Điều khiển hệ thống',
            controlSubtitle: 'Restart, Shutdown, Backup',
            restartApp: 'Khởi động lại ứng dụng',
            restartAppDesc: 'Restart lại ứng dụng web (không restart hệ thống)',
            restartAppBtn: 'Restart App',
            restartPi: 'Khởi động lại Raspberry Pi',
            restartPiDesc: 'Restart toàn bộ hệ thống Raspberry Pi',
            restartPiBtn: 'Restart Pi',
            shutdown: 'Tắt máy',
            shutdownDesc: 'Tắt nguồn Raspberry Pi (cần bật lại thủ công)',
            shutdownBtn: 'Shutdown',
            backupDb: 'Sao lưu Database',
            backupDbDesc: 'Tạo bản backup MySQL lưu vào thư mục backups',
            backupDbBtn: 'Backup Now',
            clearCache: 'Xóa Cache & Logs',
            clearCacheDesc: 'Xóa bộ nhớ đệm và các file log cũ',
            clearCacheBtn: 'Clear Cache',
            systemInfo: 'Thông tin hệ thống',
            systemInfoDesc: 'Xem chi tiết hệ thống và tài nguyên',
            systemInfoBtn: 'Chi tiết',
            warningActions: 'Các hành động dưới đây sẽ ảnh hưởng đến hệ thống. Hãy cẩn thận!',
            // Location config
            locationConfig: 'Cấu hình vị trí',
            locationSubtitle: 'Tọa độ GPS & Địa chỉ',
            locationHint: 'Nhập tên địa điểm và lấy tọa độ tự động',
            step1: 'Bước 1: Tìm kiếm vị trí',
            useCurrentLocation: 'Sử dụng vị trí hiện tại (GPS)',
            or: 'HOẶC',
            searchPlaceholder: 'VD: Sài Gòn, Hà Nội, Đà Nẵng...',
            searchBtn: 'Tìm kiếm',
            step2: 'Bước 2: Thông tin chi tiết',
            fullAddress: 'Địa chỉ đầy đủ',
            addressPlaceholder: 'Ví dụ: 123 Nguyễn Huệ, Q1, TP.HCM',
            latitude: 'Vĩ độ (Latitude)',
            longitude: 'Kinh độ (Longitude)',
            altitude: 'Độ cao (m)',
            timezone: 'Múi giờ',
            saveLocation: 'Lưu cài đặt vị trí',
            // MySQL config
            mysqlConfig: 'Kết nối MySQL',
            mysqlSubtitle: 'Cơ sở dữ liệu',
            mysqlHint: 'Nhập thông tin kết nối MySQL. Nhấn "Kiểm tra" để xác minh kết nối trước khi lưu.',
            connectionStatus: 'Trạng thái kết nối hiện tại',
            checking: 'Đang kiểm tra...',
            connectionInfo: 'Thông tin kết nối',
            host: 'Host',
            hostNote: 'VD: localhost, 127.0.0.1, mysql.example.com',
            port: 'Port',
            portNote: 'Mặc định: 3306',
            username: 'Username',
            usernameNote: 'Tên đăng nhập MySQL',
            password: 'Password',
            passwordNote: 'Mật khẩu (để trống nếu không có)',
            database: 'Database',
            databaseNote: 'Tên cơ sở dữ liệu',
            testConnection: 'Kiểm tra kết nối',
            saveSettings: 'Lưu cài đặt'
        }
    },
    en: {
        // Navigation
        nav: {
            overview: 'Overview',
            charts: 'Charts & Analysis',
            forecast: 'Forecast (ML)',
            mlTraining: 'ML Training',
            mysql: 'MySQL Data Management',
            settings: 'System Settings'
        },
        // Common
        common: {
            loading: 'Loading...',
            refresh: 'Refresh Data',
            save: 'Save',
            cancel: 'Cancel',
            confirm: 'Confirm',
            delete: 'Delete',
            export: 'Export',
            import: 'Import',
            apply: 'Apply',
            reset: 'Reset',
            search: 'Search',
            filter: 'Filter',
            all: 'All',
            today: 'Today',
            previous: 'Previous',
            next: 'Next',
            page: 'Page',
            warning: 'Warning',
            error: 'Error',
            success: 'Success',
            active: 'Active',
            inactive: 'Inactive'
        },
        // Index/Overview page
        index: {
            pageTitle: 'Weather Overview',
            currentWeather: 'Current Weather',
            humidity: 'Humidity',
            wind: 'Wind',
            pressure: 'Pressure',
            location: 'District 9, HCMC',
            lastUpdate: 'Updated at',
            iotSensorData: 'IoT Sensor Data (Real-time)',
            temperature: 'Temperature',
            co2: 'CO₂',
            dust: 'Fine Dust',
            weatherApiData: 'Weather API Data',
            windSpeed: 'Wind Speed',
            rainfall: 'Rainfall',
            uvIndex: 'UV Index',
            forecast7Days: '7-Day Forecast (ML Model)',
            forecast7DaysDesc: 'Weather forecast from trained Prophet model',
            forecastHourly: 'Hourly Forecast - 24 Hours (ML Model)',
            forecastHourlyDesc: 'Detailed hourly forecast for the next 24 hours from ML model',
            systemStatus: 'System Status',
            activeSensors: 'Active Sensors',
            quantity: 'Quantity',
            dataRecords: 'Data Records',
            todayRecords: 'Today',
            lastUpdateTime: 'Last Update',
            time: 'Time',
            status: 'Status',
            system: 'System'
        },
        // Charts page
        charts: {
            pageTitle: 'Charts & Analysis',
            dataFilter: 'Data Filter',
            quickTimeRange: 'Quick Time Range',
            last24h: 'Last 24 hours',
            last7d: 'Last 7 days',
            last30d: 'Last 30 days',
            custom: 'Custom',
            fromDate: 'From Date & Time',
            toDate: 'To Date & Time',
            node: 'Node',
            granularity: 'Display Granularity',
            byHour: 'By Hour (detailed)',
            byDay: 'By Day',
            byWeek: 'By Week',
            applyFilter: 'Apply Filter',
            resetFilter: 'Reset',
            timeRangeViewing: 'Time range viewing:',
            allSensors: 'All Sensors - Detailed View',
            allSensorsDesc: 'Display all IoT sensor and Weather API data in a unified interface',
            statistics: 'Overall Statistics'
        },
        // Forecast page
        forecast: {
            pageTitle: 'Weather Forecast (ML)',
            modelInfo: 'Model Information',
            currentModel: 'Current Model',
            trainedOn: 'Trained on',
            accuracy: 'Accuracy',
            forecastSummary: 'Forecast Summary',
            hourlyForecast: 'Hourly Forecast (24h)',
            dailyForecast: 'Daily Forecast (7 days)',
            confidence: 'Confidence',
            rainProbability: 'Rain Probability',
            rain: 'Rain',
            noRain: 'No Rain'
        },
        // ML Training page
        mlTraining: {
            pageTitle: 'ML Model Training',
            heroTitle: 'Machine Learning Training Center',
            heroDesc: 'Train and manage weather forecasting models using real IoT data',
            dataPoints: 'Data Points',
            modelsAvailable: 'Available Models',
            lastTraining: 'Last Training',
            avgAccuracy: 'Avg Accuracy',
            trainingConfig: 'Training Configuration',
            selectModel: 'Select Model',
            trainingDays: 'Training Days',
            startTraining: 'Start Training',
            stopTraining: 'Stop Training',
            trainingProgress: 'Training Progress',
            steps: {
                loadData: 'Load Data',
                preprocess: 'Preprocess',
                train: 'Train',
                validate: 'Validate',
                save: 'Save Model'
            },
            results: 'Training Results',
            trainingHistory: 'Training History'
        },
        // MySQL page
        mysql: {
            pageTitle: 'MySQL Data Management',
            dbOverview: 'Database Overview',
            totalRecords: 'Total Records',
            storageSize: 'Estimated Size',
            latestRecord: 'Latest Record',
            filterSearch: 'Filter & Search',
            timeRange: 'Time Range',
            searchPlaceholder: 'Enter ID or time...',
            refreshData: 'Refresh Data',
            dataTable: 'Data Table',
            tableHeaders: {
                id: 'ID',
                time: 'Time',
                node: 'Node',
                temperature: 'Temperature (°C)',
                humidity: 'Humidity (%)',
                pressure: 'Pressure (hPa)',
                co2: 'CO₂ (ppm)',
                dust: 'Fine Dust (µg/m³)',
                aqi: 'AQI'
            },
            tools: 'Data Management Tools',
            exportData: 'Export Data',
            exportDesc: 'Export data to CSV, JSON or Excel',
            backup: 'Backup',
            backupDesc: 'Create database backup',
            optimize: 'Optimize',
            optimizeDesc: 'Optimize tables and indexes',
            viewStats: 'View',
            statsDesc: 'View detailed statistics',
            dataCleanup: 'Data Cleanup',
            cleanupWarning: 'Deleting old data will reduce database size. However, deleted data cannot be recovered.',
            selectDeleteRange: 'Select time range to delete',
            fromDate: 'From Date',
            toDate: 'To Date',
            lastWeek: 'Last Week',
            lastMonth: 'Last Month',
            last3Months: 'Last 3 Months',
            olderThan7Days: 'Older than 7 days',
            olderThan30Days: 'Older than 30 days',
            deleteByRange: 'Delete by Range',
            deleteAll: 'Delete All Data',
            confirmDelete: 'Confirm Delete',
            confirmDeleteMsg: 'Are you sure you want to delete old data?'
        },
        // Settings page
        settings: {
            pageTitle: 'System Settings',
            bannerTitle: 'System Settings',
            bannerDesc: 'Manage all AIoT Weather system settings',
            mqttConfig: 'MQTT Configuration',
            mqttBroker: 'MQTT Broker',
            mqttPort: 'Port',
            mqttUser: 'Username',
            mqttPass: 'Password',
            mqttTopic: 'Topic',
            dbConfig: 'Database Configuration',
            dbHost: 'Host',
            dbPort: 'Port',
            dbUser: 'Username',
            dbPass: 'Password',
            dbName: 'Database Name',
            weatherApiConfig: 'Weather API Configuration',
            apiKey: 'API Key',
            apiLocation: 'Location',
            systemConfig: 'System Configuration',
            updateInterval: 'Update Interval (seconds)',
            dataRetention: 'Data Retention (days)',
            autoBackup: 'Auto Backup',
            testConnection: 'Test Connection',
            saveSettings: 'Save Settings'
        },
        // Weather descriptions
        weather: {
            sunny: 'Sunny',
            cloudy: 'Cloudy',
            rainy: 'Rainy',
            stormy: 'Stormy',
            foggy: 'Foggy',
            windy: 'Windy',
            hot: 'Hot',
            cold: 'Cold',
            humid: 'Humid'
        },
        // Extended Forecast page
        forecastExt: {
            loadingForecast: 'Loading forecast...',
            pleaseWait: 'Please wait a moment',
            forecast24h: '24-Hour Forecast',
            refreshBtn: 'Refresh',
            forecastDetail: 'Forecast Details',
            tableTime: 'Time',
            tableTemp: 'Temperature (°C)',
            tableHumidity: 'Humidity (%)',
            tablePressure: 'Pressure (mb)',
            tableAqi: 'AQI',
            tableRain: 'Rain?',
            tableConfidence: 'Confidence (%)',
            forecastStats: 'Forecast Statistics',
            avgTemp: 'Avg Temperature',
            avgHumidity: 'Avg Humidity',
            rainProb: 'Rain Probability',
            maxTemp: 'Max Temperature',
            minTemp: 'Min Temperature',
            modelInfo: 'ML Model Information',
            modelUsing: 'Current Model',
            modelStatusLabel: 'Status',
            lastTrained: 'Last Trained',
            accuracyLabel: 'Accuracy',
            trainedModels: 'Trained Models',
            notLoaded: 'Not loaded'
        },
        // Extended ML Training page
        mlTrainingExt: {
            heroTitle: 'Forecast Model Training',
            heroDesc: 'Use Machine Learning to accurately forecast weather from IoT sensor data',
            currentInfo: 'Current Information',
            model: 'Model',
            lastTrain: 'Last Training',
            r2Score: 'R² Score',
            dataLabel: 'Data',
            configStart: 'Configuration & Start',
            selectModel: 'Select Model',
            prophetRecommend: 'Prophet (Recommended)',
            lstmDeep: 'LSTM (Deep Learning)',
            dataAmount: 'Data Amount',
            targetVar: 'Target Variable',
            targetAll: 'All (temperature, humidity, AQI, pressure)',
            trainTestRatio: 'Train/Test Ratio',
            ratioDefault: '80/20 (Default)',
            startTraining: 'Start Training',
            stopTraining: 'Stop Training',
            trainingProgress: 'Training Progress',
            step: 'Step',
            trainingStatus: 'Training Status',
            logs: 'Logs',
            results: 'Training Results',
            autoScheduler: 'Auto Training Scheduler',
            autoTrainEnabled: 'Auto training enabled',
            autoTrainDisabled: 'Auto training disabled',
            enableAutoTrain: 'Enable Auto',
            disableAutoTrain: 'Disable Auto',
            trainNow: 'Train Now',
            history: 'Training History',
            modelComparison: 'Model Comparison',
            noHistory: 'No training history yet',
            trainFirstModel: 'Train your first model!'
        },
        // Extended MySQL page
        mysqlExt: {
            dbOverview: 'Database Overview',
            totalRecords: 'Total Records',
            estSize: 'Estimated Size',
            latestRecord: 'Latest Record',
            filterSearch: 'Filter & Search',
            timeRange: 'Time Range',
            today: 'Today',
            last24h: 'Last 24 hours',
            last7d: 'Last 7 days',
            all: 'All',
            node: 'Node',
            allNodes: 'All',
            searchLabel: 'Search (ID or time)',
            searchPlaceholder: 'Enter ID or time...',
            refreshData: 'Refresh Data',
            dataTable: 'Data Table',
            thId: 'ID',
            thTime: 'Time',
            thNode: 'Node',
            thTemp: 'Temperature (°C)',
            thHumidity: 'Humidity (%)',
            thPressure: 'Pressure (hPa)',
            thCo2: 'CO₂ (ppm)',
            thDust: 'Fine Dust (µg/m³)',
            thAqi: 'AQI',
            prev: '← Previous',
            next: 'Next →',
            page: 'Page',
            tools: 'Data Management Tools',
            exportData: 'Export Data',
            exportDesc: 'Export data to CSV, JSON or Excel',
            exportBtn: 'Export',
            backup: 'Backup',
            backupDesc: 'Create database backup',
            backupBtn: 'Backup',
            optimize: 'Optimize',
            optimizeDesc: 'Optimize tables and indexes',
            optimizeBtn: 'Optimize',
            stats: 'Statistics',
            statsDesc: 'View detailed statistics',
            viewBtn: 'View',
            dataCleanup: 'Data Cleanup',
            cleanupWarning: 'Deleting old data will reduce database size. However, deleted data cannot be recovered.',
            selectDeleteRange: 'Select time range to delete',
            fromDate: 'From Date',
            toDate: 'To Date',
            lastWeek: 'Last Week',
            lastMonth: 'Last Month',
            last3Months: 'Last 3 Months',
            older7Days: 'Older than 7 days',
            older30Days: 'Older than 30 days',
            selectRangeHint: 'Select time range to see number of records to be deleted',
            deleteByRange: 'Delete by Range',
            deleteAll: 'Delete All Data',
            confirmDelete: 'Confirm Delete',
            confirmDeleteMsg: 'Are you sure you want to delete old data?',
            cancel: 'Cancel',
            confirm: 'Confirm'
        },
        // Extended Settings page
        settingsExt: {
            bannerTitle: 'AIoT System Configuration',
            bannerDesc: 'Manage devices, connections, location, and system parameters',
            rpiStats: 'Raspberry Pi Stats',
            rpiSubtitle: 'RAM, CPU, GPU & Temperature',
            cpuUsage: 'CPU Usage',
            cores: 'Cores',
            freq: 'Freq',
            memory: 'Memory (RAM)',
            used: 'Used',
            total: 'Total',
            gpuMemory: 'GPU Memory',
            allocated: 'Allocated',
            cpuTemp: 'CPU Temperature',
            tempStatus: 'Status',
            tempGood: 'Normal',
            tempWarm: 'Warm',
            tempHot: 'Hot',
            storage: 'Storage',
            free: 'Free',
            uptime: 'System Uptime',
            bootTime: 'Boot time',
            systemControl: 'System Control',
            controlSubtitle: 'Restart, Shutdown, Backup',
            restartApp: 'Restart Application',
            restartAppDesc: 'Restart the web application (not the system)',
            restartAppBtn: 'Restart App',
            restartPi: 'Restart Raspberry Pi',
            restartPiDesc: 'Restart the entire Raspberry Pi system',
            restartPiBtn: 'Restart Pi',
            shutdown: 'Shutdown',
            shutdownDesc: 'Power off Raspberry Pi (manual restart required)',
            shutdownBtn: 'Shutdown',
            backupDb: 'Backup Database',
            backupDbDesc: 'Create MySQL backup to backups folder',
            backupDbBtn: 'Backup Now',
            clearCache: 'Clear Cache & Logs',
            clearCacheDesc: 'Clear cache and old log files',
            clearCacheBtn: 'Clear Cache',
            systemInfo: 'System Information',
            systemInfoDesc: 'View system details and resources',
            systemInfoBtn: 'Details',
            warningActions: 'Actions below will affect the system. Be careful!',
            // Location config
            locationConfig: 'Location Configuration',
            locationSubtitle: 'GPS Coordinates & Address',
            locationHint: 'Enter location name to auto-get coordinates',
            step1: 'Step 1: Search Location',
            useCurrentLocation: 'Use Current Location (GPS)',
            or: 'OR',
            searchPlaceholder: 'E.g.: Ho Chi Minh, Hanoi, Da Nang...',
            searchBtn: 'Search',
            step2: 'Step 2: Detailed Information',
            fullAddress: 'Full Address',
            addressPlaceholder: 'E.g.: 123 Nguyen Hue, District 1, HCMC',
            latitude: 'Latitude',
            longitude: 'Longitude',
            altitude: 'Altitude (m)',
            timezone: 'Timezone',
            saveLocation: 'Save Location Settings',
            // MySQL config
            mysqlConfig: 'MySQL Connection',
            mysqlSubtitle: 'Database',
            mysqlHint: 'Enter MySQL connection info. Click "Test" to verify connection before saving.',
            connectionStatus: 'Current Connection Status',
            checking: 'Checking...',
            connectionInfo: 'Connection Information',
            host: 'Host',
            hostNote: 'E.g.: localhost, 127.0.0.1, mysql.example.com',
            port: 'Port',
            portNote: 'Default: 3306',
            username: 'Username',
            usernameNote: 'MySQL login name',
            password: 'Password',
            passwordNote: 'Password (leave blank if none)',
            database: 'Database',
            databaseNote: 'Database name',
            testConnection: 'Test Connection',
            saveSettings: 'Save Settings'
        }
    }
};

// ===== i18n Manager =====
const i18n = {
    currentLang: localStorage.getItem('language') || 'vi',
    
    // Initialize language system
    init() {
        this.currentLang = localStorage.getItem('language') || 'vi';
        this.updatePageContent();
        this.updateLanguageSwitcher();
    },
    
    // Get translation by key path (e.g., 'nav.overview')
    t(keyPath) {
        const keys = keyPath.split('.');
        let value = translations[this.currentLang];
        
        for (const key of keys) {
            if (value && value[key] !== undefined) {
                value = value[key];
            } else {
                // Fallback to Vietnamese if key not found
                value = translations['vi'];
                for (const k of keys) {
                    if (value && value[k] !== undefined) {
                        value = value[k];
                    } else {
                        return keyPath; // Return key path if not found
                    }
                }
                break;
            }
        }
        
        return value;
    },
    
    // Switch language
    switchLanguage(lang) {
        if (translations[lang]) {
            this.currentLang = lang;
            localStorage.setItem('language', lang);
            this.updatePageContent();
            this.updateLanguageSwitcher();
            
            // Dispatch custom event for other scripts to listen
            window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
            
            // Show toast notification
            if (typeof showToast === 'function') {
                const msg = lang === 'vi' ? 'Đã chuyển sang Tiếng Việt' : 'Switched to English';
                showToast(msg, 'success');
            }
        }
    },
    
    // Toggle between languages
    toggleLanguage() {
        const newLang = this.currentLang === 'vi' ? 'en' : 'vi';
        this.switchLanguage(newLang);
    },
    
    // Update all elements with data-i18n attribute
    updatePageContent() {
        // Update elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);
            if (translation) {
                el.textContent = translation;
            }
        });
        
        // Update elements with data-i18n-placeholder attribute
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const translation = this.t(key);
            if (translation) {
                el.placeholder = translation;
            }
        });
        
        // Update elements with data-i18n-title attribute
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const translation = this.t(key);
            if (translation) {
                el.title = translation;
            }
        });
        
        // Update page title
        const pageTitleEl = document.querySelector('[data-i18n-page-title]');
        if (pageTitleEl) {
            document.title = this.t(pageTitleEl.getAttribute('data-i18n-page-title')) + ' - AIoT Weather';
        }
        
        // Update HTML lang attribute
        document.documentElement.lang = this.currentLang;
    },
    
    // Update language switcher button appearance
    updateLanguageSwitcher() {
        const switcher = document.getElementById('langSwitcher');
        const currentFlag = document.getElementById('currentLangFlag');
        const currentText = document.getElementById('currentLangText');
        
        if (currentFlag) {
            currentFlag.textContent = this.currentLang === 'vi' ? '🇻🇳' : '🇬🇧';
        }
        if (currentText) {
            currentText.textContent = this.currentLang === 'vi' ? 'VI' : 'EN';
        }
        
        // Update dropdown active state
        document.querySelectorAll('.lang-option').forEach(opt => {
            opt.classList.remove('active');
            if (opt.getAttribute('data-lang') === this.currentLang) {
                opt.classList.add('active');
            }
        });
    },
    
    // Get current language
    getCurrentLanguage() {
        return this.currentLang;
    },
    
    // Check if current language is Vietnamese
    isVietnamese() {
        return this.currentLang === 'vi';
    },
    
    // Check if current language is English
    isEnglish() {
        return this.currentLang === 'en';
    }
};

// Initialize i18n when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    i18n.init();
});

// Export for use in other scripts
window.i18n = i18n;
window.translations = translations;
