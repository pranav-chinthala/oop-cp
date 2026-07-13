# **1\. Introduction**

DisasterAlert is a comprehensive real-time disaster management and emergency response system developed as a desktop application using Java and JavaFX. The system is designed to address the critical need for a centralized, accessible, and responsive platform that aggregates disaster information, notifies affected communities, provides live evacuation routes, and coordinates authority responses during natural and man-made emergencies.

India is one of the most disaster-prone countries in the world, regularly facing floods, cyclones, earthquakes, fires, and other calamities. The lack of a unified and accessible information platform for the general public and emergency responders significantly hampers disaster response efforts. DisasterAlert aims to bridge this gap by providing a feature-rich system accessible to both administrators who manage disaster data and regular users who need real-time alerts and safety information.

## **1.1 Objectives**

* Develop a multi-user disaster monitoring and alert system with role-based access (Admin and User).

* Provide real-time visualization of active disasters across India on an interactive map using Leaflet.js.

* Implement evacuation route management with live map rendering.

* Enable authority response tracking to monitor government and rescue team deployments.

* Design a professional, intuitive dark-themed user interface using JavaFX and CSS.

* Integrate a MySQL backend for persistent storage and retrieval of all disaster and user data.

* Apply core Object-Oriented Programming principles throughout the entire codebase.

## **1.2 Scope**

The DisasterAlert system covers the following functional domains:

* User Authentication: Secure login and registration with role-based access control.

* Dashboard: Live statistics, disaster table with filtering, search, and detail pane.

* Map View: Interactive Leaflet.js map showing disaster location, danger zones, evacuation routes, and safe shelters.

* History: Complete record of all disasters including resolved ones, with search capability.

* Statistics: Visual analytics using Chart.js charts rendered via JavaFX WebView.

* Authority Tracker: Management of government and rescue team responses per disaster.

* Admin Panel: Ability to add, resolve, and delete disaster records.

## **1.3 Technology Stack**

| Component | Technology | Purpose |
| ----- | ----- | ----- |
| Frontend UI | JavaFX 17 \+ FXML \+ CSS | Desktop application UI and styling |
| Backend Logic | Java 17 (OOP) | Business logic, controllers, DAO layer |
| Database | MySQL 8.x | Persistent storage of all application data |
| Database Connectivity | JDBC (mysql-connector-j 9.6) | Java-MySQL communication |
| Map Rendering | Leaflet.js (via WebView) | Interactive real-time disaster maps |
| Charts | Chart.js (via WebView) | Statistical visualizations |
| Build/IDE | IntelliJ IDEA 2025 | Development environment |
| Runtime | JDK 17 \+ JavaFX SDK 17 | Application execution |

# **2\. Literature Survey**

A thorough review of existing disaster management systems and related technologies was conducted to inform the design and development of DisasterAlert.

## **2.1 Existing Systems and Research**

**2.1.1 National Disaster Management Information System (NDMIS), India**

The NDMIS operated by the National Disaster Management Authority (NDMA) is a government portal that provides disaster-related data, guidelines, and alerts. While comprehensive from a policy perspective, it lacks real-time interactive features for general users and does not provide live map-based evacuation guidance. DisasterAlert addresses this gap with an interactive, user-facing map view and real-time alert mechanism.

**2.1.2 FEMA Emergency Alert System (USA)**

FEMA's Integrated Public Alert and Warning System (IPAWS) is a national public warning system that disseminates emergency alerts via broadcast, wireless networks, and internet channels. Research into IPAWS informed DisasterAlert's multi-role notification design, particularly the separation between admin-controlled alert creation and user-facing alert consumption.

**2.1.3 Ushahidi Platform**

Ushahidi is an open-source crisis-mapping platform used globally for crowdsourced disaster reporting. It pioneered the use of interactive maps in disaster management. The map-centric design of DisasterAlert's Map View screen, with layered danger zones and evacuation routes using Leaflet.js, draws inspiration from Ushahidi's approach to geospatial crisis visualization.

**2.1.4 Research: JavaFX for Enterprise Desktop Applications**

Multiple studies have validated JavaFX as a robust framework for building data-intensive desktop applications. Weaver et al. (2012) in "Pro JavaFX 2" established patterns for MVC-based JavaFX architecture that directly influenced the Controller-FXML-DAO structure adopted in DisasterAlert. The separation of UI (FXML), logic (Controller), and data (DAO) layers is a well-established JavaFX best practice.

**2.1.5 Research: JDBC and MySQL for Java Applications**

The use of JDBC with MySQL as a persistence layer for Java applications is extensively documented. Connolly and Begg (2015) in "Database Systems: A Practical Approach to Design, Implementation, and Management" provided foundational database design principles applied in this project, including normalization of the disaster, user, evacuation\_route, and authority\_response tables.

**2.1.6 Leaflet.js for Web-Based Maps**

Leaflet.js is the leading open-source JavaScript library for mobile-friendly interactive maps, used by organizations including OpenStreetMap, GitHub, and the European Commission. Its integration via JavaFX WebView in DisasterAlert allows rendering of OpenStreetMap tiles, custom markers, polyline evacuation routes, and danger zone circles without requiring a native mapping SDK.

## **2.2 Gap Analysis**

| Existing System | Limitation | DisasterAlert Solution |
| ----- | ----- | ----- |
| NDMIS India | No interactive map, no real-time user alerts | Live Leaflet.js map with evacuation routes |
| FEMA IPAWS | No desktop application, no authority tracking | Authority Response Tracker module |
| Ushahidi | Web-only, no role-based admin panel | Admin/User roles with admin-only CRUD |
| Generic Apps | No statistics/analytics module | Chart.js-powered analytics dashboard |

# **3\. Object-Oriented Programming Concepts Applied**

DisasterAlert was architected with a strong emphasis on OOP principles. The following section details how each core OOP concept is applied in the codebase.

## **3.1 Encapsulation**

All model classes (Disaster, User, EvacuationRoute, AuthorityResponse) encapsulate their attributes as private fields with public getter and setter methods. For example, the Disaster model class holds private fields such as id, type, severity, location, description, status, and reportedAt, accessed only through their respective getters and setters. This ensures data integrity and controlled access throughout the application.

## **3.2 Inheritance**

The BaseDAO abstract class defines common database connection and resource management logic that is inherited by DisasterDAO, UserDAO, and AuthorityResponseDAO. This eliminates code duplication in connection handling and exception management across the data access layer.

## **3.3 Polymorphism**

JavaFX controller classes implement the Initializable interface, and each controller overrides the initialize() method differently based on the screen's requirements. For example, DashboardController.initialize() loads disaster statistics and populates the table, while StatsController.initialize() generates Chart.js HTML for the WebView. Method overloading is also used in the DAO layer where load methods accept different parameter combinations for filtered queries.

## **3.4 Abstraction**

The DAO (Data Access Object) pattern provides abstraction over database operations. Controllers interact with DAO interfaces without knowing the underlying SQL queries. For instance, DashboardController calls DisasterDAO.getAllDisasters() and DisasterDAO.getDisastersByFilter() without being concerned with query construction or result set processing.

## **3.5 MVC Architecture**

The application follows a strict Model-View-Controller architecture enforced by JavaFX's FXML framework:

* Model: Java POJO classes (Disaster, User, EvacuationRoute, AuthorityResponse) in the model package.

* View: FXML files (Dashboard.fxml, Login.fxml, Register.fxml, History.fxml, Stats.fxml, Map.fxml, AddDisaster.fxml, Authority.fxml) in the resources/fxml directory.

* Controller: Java controller classes (DashboardController, LoginController, RegisterController, HistoryController, StatsController, MapController, AddDisasterController, AuthorityController) in the controller package.

## **3.6 Class Structure Overview**

| Package | Class/File | Responsibility |
| ----- | ----- | ----- |
| model | Disaster.java | Encapsulates disaster entity attributes |
| model | User.java | Encapsulates user entity with role field |
| model | EvacuationRoute.java | Stores route and safe location data |
| model | AuthorityResponse.java | Models authority deployment records |
| dao | DisasterDAO.java | CRUD operations on disaster table |
| dao | UserDAO.java | User authentication and registration |
| dao | AuthorityResponseDAO.java | Authority response CRUD and statistics |
| controller | LoginController.java | Handles login authentication |
| controller | RegisterController.java | Manages user registration |
| controller | DashboardController.java | Main dashboard logic and navigation |
| controller | HistoryController.java | Disaster history display and search |
| controller | StatsController.java | Chart.js statistics generation |
| controller | MapController.java | Leaflet.js map HTML generation |
| controller | AddDisasterController.java | Admin disaster creation form |
| controller | AuthorityController.java | Authority response management |
| util | DBConnection.java | Singleton database connection manager |
| resources/fxml | 8 FXML files | UI layout definitions |
| resources | style.css | Dark theme CSS stylesheet |

# **4\. System Design**

## **4.1 Database Schema**

The application uses a MySQL database with the following normalized table structure:

**Table: users**

| Column | Type | Description |
| ----- | ----- | ----- |
| id | INT (PK, AUTO\_INCREMENT) | Unique user identifier |
| name | VARCHAR(100) | Full name of the user |
| email | VARCHAR(100) UNIQUE | Email address used for login |
| password | VARCHAR(255) | User password |
| role | ENUM('admin','user') | Access level of the user |
| location | VARCHAR(100) | City/region of the user |
| contact | VARCHAR(20) | Mobile contact number |
| created\_at | TIMESTAMP | Account creation timestamp |

**Table: disasters**

| Column | Type | Description |
| ----- | ----- | ----- |
| id | INT (PK, AUTO\_INCREMENT) | Unique disaster identifier |
| type | VARCHAR(50) | Type of disaster (Flood, Fire, Earthquake, etc.) |
| severity | ENUM('LOW','MEDIUM','HIGH','CRITICAL') | Severity level |
| location | VARCHAR(150) | Geographic location of the disaster |
| description | TEXT | Detailed description of the event |
| status | ENUM('Active','Resolved') | Current status |
| reported\_at | TIMESTAMP | When the disaster was reported |

**Table: evacuation\_routes**

| Column | Type | Description |
| ----- | ----- | ----- |
| id | INT (PK, AUTO\_INCREMENT) | Unique route identifier |
| disaster\_id | INT (FK) | Associated disaster |
| safe\_location | VARCHAR(200) | Name of the safe shelter |
| route\_description | TEXT | Directions and route details |
| emergency\_contact | VARCHAR(50) | Emergency contact number |

**Table: authority\_responses**

| Column | Type | Description |
| ----- | ----- | ----- |
| id | INT (PK, AUTO\_INCREMENT) | Unique response identifier |
| disaster\_id | INT (FK) | Associated disaster |
| authority\_name | VARCHAR(150) | Name of the responding authority |
| authority\_type | VARCHAR(100) | Type (NDRF, Fire Brigade, Police, etc.) |
| status | ENUM('...') | ACKNOWLEDGED, DISPATCHED, ON\_SITE, CONTAINED, RESOLVED |
| personnel\_count | INT | Number of personnel deployed |
| action\_taken | TEXT | Description of actions being taken |
| updated\_at | TIMESTAMP | Last status update time |

## **4.2 Application Flow**

1. Application starts at Main.java, which loads Login.fxml.

2. User enters credentials; LoginController validates against UserDAO.authenticate().

3. On success, role is stored in a session and Dashboard.fxml is loaded.

4. DashboardController.initialize() fetches all active disasters from DisasterDAO and populates statistics and table.

5. Admin users see the Admin Actions panel (Add, Resolve, Delete).

6. Clicking a disaster row populates the detail pane with evacuation routes.

7. Clicking VIEW ON MAP opens Map.fxml with MapController generating Leaflet.js HTML.

8. HISTORY navigates to History.fxml showing all records including resolved ones.

9. STATS navigates to Stats.fxml where StatsController generates Chart.js analytics HTML.

10. AUTHORITY STATUS opens Authority.fxml for authority response tracking.

**4.3 Flow Chart**

# 

# **5\. Sample Screenshots**

The following screenshots demonstrate the key functional screens of the DisasterAlert system. Please insert the actual screenshots at the marked positions.

## **Screenshot 1: Login Screen**

Description: The login screen features a dark theme with a glassmorphic card design. It provides fields for email and password, displays demo credentials for testing (admin@disaster.app / admin123 and rahul@example.com / user123), and a Create Account link for new users.

## 

## 

## 

## 

## 

## 

## 

## 

## 

## **Screenshot 2: Registration Screen**

Description: The registration screen collects the user's full name, mobile number, email, city/location, and password. Role assignment is handled automatically (user role by default). Admin accounts are created directly in the database.

## **Screenshot 3: Main Dashboard**

Description: The main dashboard is the central hub of the application. It displays four real-time stat cards showing active disasters, critical alerts, location-based alerts, and total records. The left sidebar provides navigation and admin actions. The main table lists all active disasters with type icons, color-coded severity levels, location, reported time, and status. Selecting a row opens the detail pane showing evacuation routes.

## **Screenshot 4: Map View**

Description: The Map View renders an interactive OpenStreetMap-based map using Leaflet.js inside a JavaFX WebView. It displays the disaster location as a marker, a danger zone circle (orange), a caution zone (dashed), evacuation route polylines (green), alternate routes (blue), and the safe shelter destination. The bottom panel shows the emergency contact numbers (112, 101, 108, 100\) and the disaster-specific emergency instructions.

## 

## 

## 

## 

## 

## 

## 

## 

## 

## **Screenshot 5: Disaster History**

Description: The History screen displays a complete record of all disasters including resolved ones. It includes a search bar for filtering by location or type, three informational cards summarizing the view, and a full-width table with seven columns including a Description column not present in the main dashboard.

## **Screenshot 6: Statistics Screen**

Description: The Statistics screen provides visual analytics of all disaster data. Four summary cards show total, active, resolved, and critical counts. The analytics section renders Chart.js charts via JavaFX WebView showing disaster distribution by type (bar chart) and severity breakdown (pie/doughnut chart).

## **Screenshot 7: Authority Response Tracker**

Description: The Authority Response Tracker allows admins to track government and rescue team deployments for each disaster. The left panel lists all active disasters; selecting one populates the right panel with existing authority responses. The response table shows authority name, type, status, personnel count, action taken, and last update time. The add form below allows new response entries.

## 

## 

## 

## 

## 

## 

## 

## 

## 

## 

## **Screenshot 8: Add Disaster (Admin)**

Added Disaster Displayed on Dashboard Successfully

Description: The Add Disaster form is accessible only to admin users. It allows entry of disaster type (from ComboBox), severity level, location, and description. An optional evacuation route section allows adding safe shelter name, route directions, and emergency contact. The form is styled with an orange accent theme to visually distinguish it from other screens.

**6\. Conclusion**

The DisasterAlert Real-Time Emergency Response System successfully demonstrates the application of Object-Oriented Programming principles in building a fully functional, database-driven desktop application using Java 17 and JavaFX 17\.

The project achieved all its stated objectives: a working multi-user authentication system, a real-time disaster dashboard with live statistics, an interactive map with evacuation routes, a history and analytics module, and an authority response tracking system. The application was built with a professional dark-themed user interface with consistent styling across all eight screens using a shared CSS stylesheet.

Key OOP principles including encapsulation (model classes), inheritance (BaseDAO), polymorphism (controller initialize methods), and abstraction (DAO layer) were applied throughout, resulting in a maintainable, extensible, and well-structured codebase. The MVC architecture enforced by JavaFX's FXML framework ensured clean separation of concerns between the UI, business logic, and data layers.

The integration of web technologies (Leaflet.js for maps, Chart.js for analytics) within a Java desktop application via JavaFX WebView demonstrates the flexibility of the JavaFX platform for building hybrid desktop applications that leverage existing web libraries.

The MySQL backend with a normalized four-table schema ensures data integrity and efficient query performance for the disaster, user, evacuation route, and authority response data.

# **7\. Future Scope**

DisasterAlert has a strong foundation that can be extended in several meaningful directions:

## **7.1 Technical Enhancements**

* Mobile Application: Develop companion Android/iOS apps using Flutter or React Native that sync with the same MySQL backend, extending alerts to mobile users.

* Push Notifications: Integrate SMS and email notification services (Twilio, SendGrid) to alert registered users when a disaster is reported in their registered city.

* Real-Time Data Sync: Replace manual refresh with WebSocket or polling-based auto-refresh so the dashboard updates without user intervention.

* REST API Backend: Migrate from direct JDBC to a Spring Boot REST API backend, enabling web, mobile, and desktop clients to share the same data layer.

* Geolocation-Based Alerts: Use device GPS data to automatically calculate proximity to active disasters rather than relying on manually entered city names.

## **7.2 Functional Enhancements**

* IoT Sensor Integration: Connect the system with weather stations, seismic sensors, and flood gauges to enable automated disaster detection and reporting.

* Machine Learning Prediction: Implement ML models trained on historical disaster data to predict disaster likelihood by region and season.

* Community Reporting: Allow general users to submit disaster sightings with photo evidence, with admin moderation before publishing.

* Resource Management: Add a module for tracking available rescue resources (vehicles, shelters, medical supplies) and their allocation to active disasters.

* Multi-Language Support: Add Hindi and regional language support to make the application accessible to non-English-speaking users in rural areas.

## **7.3 Infrastructure**

* Cloud Deployment: Host the MySQL database on AWS RDS or Google Cloud SQL for high availability and scalability.

* Disaster Recovery: Implement automated daily backups of the database and application logs.

* Role Expansion: Add a 'Responder' role for emergency personnel with specialized views for task assignments.

# **8\. References**

The following references were consulted during the design, development, and documentation of the DisasterAlert system:

## **Books and Academic References**

1. Bloch, J. (2018). Effective Java (3rd ed.). Addison-Wesley Professional. — Applied for best practices in Java class design, exception handling, and API design patterns used in the DAO layer.

2. Connolly, T., & Begg, C. (2015). Database Systems: A Practical Approach to Design, Implementation, and Management (6th ed.). Pearson Education. — Applied for relational database design and normalization of the four-table MySQL schema.

3. Weaver, J., Gao, W., Chin, S., Iverson, D., & Vos, J. (2012). Pro JavaFX 2: A Definitive Guide to Rich Clients with Java Technology. Apress. — Referenced for MVC architecture patterns, FXML-controller binding, and JavaFX scene management.

4. Deitel, P., & Deitel, H. (2020). Java How to Program, Early Objects (11th ed.). Pearson Education. — Foundational reference for OOP concepts, inheritance, polymorphism, and encapsulation principles applied throughout the project.

## **Online Documentation and Resources**

1. Oracle Corporation. (2024). JavaFX 17 API Documentation. Retrieved from https://openjfx.io/javadoc/17/ — Primary reference for JavaFX controls, layouts, WebView, and CSS styling.

2. Oracle Corporation. (2024). JDBC Database Access. Java SE Documentation. Retrieved from https://docs.oracle.com/javase/tutorial/jdbc/ — Reference for JDBC connection management, prepared statements, and ResultSet handling.

3. MySQL AB. (2024). MySQL 8.0 Reference Manual. Retrieved from https://dev.mysql.com/doc/refman/8.0/en/ — Reference for SQL syntax, ENUM data types, and index optimization used in the database schema.

4. Leaflet.js Contributors. (2024). Leaflet — an open-source JavaScript library for mobile-friendly interactive maps (v1.9.4). Retrieved from https://leafletjs.com/reference.html — Complete API reference for markers, polylines, circles, and event handling in the Map View.

5. Chart.js Contributors. (2024). Chart.js Documentation (v4.x). Retrieved from https://www.chartjs.org/docs/latest/ — Reference for bar chart and doughnut chart configuration used in the Statistics screen.

6. OpenStreetMap Foundation. (2024). OpenStreetMap. Retrieved from https://www.openstreetmap.org — Map tile provider used by Leaflet.js for geographic base layer rendering.

## 

## 

## 

## **Government and Institutional Sources**

1. National Disaster Management Authority (NDMA), Government of India. (2024). National Disaster Management Guidelines. Retrieved from https://ndma.gov.in — Referenced for understanding India's disaster classification framework, severity levels, and standard emergency response protocols.

2. Ministry of Home Affairs, Government of India. (2024). Disaster Management in India. Retrieved from https://mha.gov.in — Referenced for emergency contact numbers (112 National Emergency, 101 Fire, 108 Ambulance, 100 Police) used in the application.