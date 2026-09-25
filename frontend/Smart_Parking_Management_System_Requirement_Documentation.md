<u>SMART PARKING MANAGEMENT SYSTEM</u>

*Project Requirement & Technical Documentation*

<u>One-Line Problem Statement</u>

> *To design and develop an automated smart parking management system
> that displays real-time car and scooter slot availability on digital
> boards and issues time-based billing receipts using recorded vehicle
> entry and exit timestamps.*

<u>DOCUMENT REVISION HISTORY</u>

| Version | Date        | Description                                            |
|---------|-------------|--------------------------------------------------------|
| 1.0     | 03-Sep-2026 | Initial draft of requirement & technical documentation |

<u>TABLE OF CONTENTS</u>

1\. Project Overview4

2\. Project Objectives4

3\. Project Scope5

4\. User Roles & Permissions5

5\. Functional Requirements6

6\. Module-wise Requirements7

7\. User Flow / Business Flow8

8\. Authentication & Authorization10

9\. Database Requirements10

10\. API Requirements12

11\. Frontend Requirements12

12\. Backend Requirements13

13\. Admin Panel Requirements13

14\. Validation & Error Handling13

15\. Security Requirements14

16\. Notifications & Third-Party Integrations14

17\. Reports & Dashboard Requirements14

18\. Non-Functional Requirements15

19\. Technology Stack15

20\. Deployment Requirements16

21\. Future Enhancements16

22\. Assumptions & Dependencies16

23\. Requirement Approval / Sign-off17

<u>1. Project Overview</u>

Parking facilities in most urban and semi-urban establishments are
organised as a fixed sequence of bays, each designated for a particular
category of vehicle. A typical arrangement of four bays, for instance,
may alternate between car and scooter spaces, with an overhead billboard
or hoarding installed above each bay for advertising or signage
purposes. At present, such facilities do not provide arriving vehicle
owners with any real-time indication of how many car or scooter slots
remain unoccupied, which results in avoidable circling within the
premises, congestion near the entrance, and inefficient use of the
available space. In addition, the recording of a vehicle's entry and
exit and the computation of the applicable parking charge is, in most
such facilities, still performed manually or through disconnected
systems, which is slow, prone to human error, and difficult to reconcile
or audit.

The Smart Parking Management System is proposed as a digitally assisted
solution to these problems. The system introduces an electronic
availability display, positioned below each billboard, that continuously
indicates the number of car parking slots available, the number of
scooter parking slots available, and the total number of slots
remaining, and updates this information automatically as vehicles enter
and leave. At the entry point, the system captures the registration
number of every incoming vehicle together with its time of entry; at the
exit point, it captures the corresponding time of exit. The duration of
stay is computed automatically, and the parking fee is calculated by
applying a predefined hourly rate configured by the facility
administrator. On completion of the transaction, a ticket or receipt
containing the date, in-time, out-time, and final amount payable is
generated and issued to the vehicle owner.

This document defines the requirements and technical specifications for
the system and serves as the basis for subsequent database design, API
design, backend and frontend development, integration, testing, and
deployment.

<u>2. Project Objectives</u>

The Smart Parking Management System is intended to achieve the following
objectives:

- To display, in real time, the number of available car slots, the
  number of available scooter slots, and the total number of available
  slots at the parking facility.

- To automatically register the vehicle number and in-time of every
  vehicle entering the facility.

- To automatically record the out-time of every vehicle leaving the
  facility.

- To compute the duration of stay and the corresponding parking charge
  based on a configurable hourly rate.

- To generate and issue a ticket/receipt containing the date, in-time,
  out-time, and final bill amount at the time of exit.

- To provide facility administrators with a panel to configure hourly
  rates, manage slots, and view operational reports.

- To reduce manual intervention, minimise human error, and maintain an
  auditable record of every parking transaction.

- To design the system in a modular manner so that it can be extended in
  the future to additional vehicle categories, facilities, or payment
  mechanisms.

<u>3. Project Scope</u>

*<u>3.1 In Scope</u>*

- Registration of vehicle number and in-time at the point of entry.

- Recording of vehicle out-time at the point of exit and automatic
  calculation of parking duration.

- Real-time computation and display of available car slots, available
  scooter slots, and total available slots.

- Configurable hourly billing rates for each vehicle category.

- Generation of a printable/digital ticket or receipt at the time of
  exit.

- An administrator panel for managing slots, rates, vehicle categories,
  and viewing reports.

- Maintenance of historical records of parking sessions and generated
  bills for reporting and audit purposes.

*<u>3.2 Out of Scope (Phase 1)</u>*

- Online advance booking or reservation of a parking slot prior to
  arrival.

- Integration with third-party payment gateways for cashless payment
  (identified as a future enhancement).

- Dynamic/surge pricing based on demand or time of day.

- Support for vehicle categories other than car and scooter (e.g., heavy
  vehicles, electric vehicles with charging requirements).

- A dedicated mobile application for vehicle owners (identified as a
  future enhancement).

<u>4. User Roles & Permissions</u>

The system distinguishes between three categories of users, each with a
distinct set of permissions, as summarised in the table below.

| Role                    | Description                                                                                                            | Key Permissions                                                                                                                            |
|-------------------------|------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------|
| Administrator           | Facility owner or manager responsible for overall configuration and oversight.                                         | Configure hourly rates; add/remove/modify slots; view and export all reports; manage operator accounts; view complete transaction history. |
| Gate Operator           | Staff member stationed at the entry/exit gate (applicable if manual verification is used alongside automated capture). | View live slot availability; manually verify/override vehicle number capture in case of sensor failure; reprint a receipt.                 |
| Vehicle Owner / Visitor | The end user of the parking facility; does not log into the system directly.                                           | View the public availability display; receive a ticket at entry (optional) and a receipt at exit.                                          |

<u>5. Functional Requirements</u>

The functional requirements of the system are listed below and are
traceable to the project objectives and module-wise requirements
described in Section 6.

1.  FR-1: The system shall capture the vehicle registration number and
    timestamp when a vehicle enters the facility.

2.  FR-2: The system shall determine slot availability for the
    corresponding vehicle category before permitting entry.

3.  FR-3: The system shall allocate an available slot to the vehicle and
    update the occupancy count upon entry.

4.  FR-4: The system shall continuously display the number of available
    car slots, available scooter slots, and total available slots on the
    digital display board.

5.  FR-5: The system shall capture the vehicle registration number and
    timestamp when a vehicle exits the facility.

6.  FR-6: The system shall calculate the duration of stay as the
    difference between out-time and in-time.

7.  FR-7: The system shall calculate the final bill by applying the
    configured hourly rate to the computed duration.

8.  FR-8: The system shall generate a ticket/receipt containing the
    date, in-time, out-time, and final bill amount at the time of exit.

9.  FR-9: The system shall update the slot availability count
    immediately upon vehicle exit.

10. FR-10: The system shall allow the administrator to configure and
    modify hourly rates for each vehicle category.

11. FR-11: The system shall maintain a persistent record of every
    parking session and every bill generated.

12. FR-12: The system shall allow the administrator to view and export
    reports on occupancy and revenue.

<u>6. Module-wise Requirements</u>

The system is organised into five principal modules, interacting with
the supporting hardware and the central database as illustrated in
Figure 6.1.

<img src="parking_md/media/950215f0ecef19f3ff297de7054ed905c0366340.png"
style="width:6.45833in;height:2.08333in" />

*Figure 6.1 — High-Level System Architecture*

*<u>6.1 Entry/Exit Registration Module</u>*

- Capture vehicle registration number automatically via ANPR camera or
  RFID reader, with a manual-entry fallback.

- Timestamp every entry and exit event using the server clock to ensure
  consistency.

- Prevent duplicate entry registration for a vehicle that is already
  recorded as "inside" the facility.

*<u>6.2 Slot Availability & Display Module</u>*

- Maintain a live count of occupied and vacant slots, categorised by
  vehicle type.

- Push updated counts to the digital display board immediately after
  every entry and exit event.

- Display the number of car slots left, number of scooter slots left,
  and the total slots left.

*<u>6.3 Billing & Receipt Module</u>*

- Compute duration of stay in hours (rounded up to the nearest billing
  unit as configured).

- Apply the applicable hourly rate for the vehicle category to compute
  the final amount.

- Generate a receipt containing date, in-time, out-time, duration, and
  final bill amount, and make it available for printing or digital
  issue.

*<u>6.4 Administration Module</u>*

- Provide configuration screens for hourly rates, slot inventory, and
  vehicle categories.

- Provide a dashboard summarising current occupancy, today's revenue,
  and recent transactions.

*<u>6.5 Reporting Module</u>*

- Generate day-wise, week-wise, and month-wise occupancy and revenue
  reports.

- Allow reports to be filtered by vehicle type and exported in a common
  format (e.g., CSV/PDF).

<u>7. User Flow / Business Flow</u>

The end-to-end business flow of the system is presented in two parts:
the entry and slot-allocation flow (Figure 7.1), followed by the exit,
billing, and receipt-generation flow (Figure 7.2).

<img src="parking_md/media/63286e67f7327db097c0984af40688ee9846bd91.png"
style="width:3.4375in;height:4.94792in" />

*Figure 7.1 — Entry & Slot Allocation Flow*

As shown in Figure 7.1, on arrival the vehicle's registration number and
in-time are captured at the entry gate. The system checks whether a slot
of the required category is available; if not, entry is denied and the
display indicates that the facility is full for that category. If a slot
is available, it is allocated, the entry barrier opens, and the
availability display is updated, after which the vehicle proceeds to
park.

<img src="parking_md/media/85cca3373dbbeb35eb9ad122b103b84cf77815ef.png"
style="width:1.97917in;height:5.08333in" />

*Figure 7.2 — Exit, Billing & Receipt Flow*

As shown in Figure 7.2, when the parked vehicle later arrives at the
exit gate, its registration number and out-time are captured, the
duration and bill are computed, a receipt is generated and issued, the
exit barrier opens, the slot is released, and the availability display
is updated once again.

<u>8. Authentication & Authorization</u>

Access to the administration and operator functions of the system shall
be protected by an authentication mechanism; the public availability
display and the vehicle owner's receipt do not require authentication.

- Administrators and gate operators shall log in using a unique username
  and password.

- Passwords shall be stored using a one-way salted hash and never in
  plain text.

- Session-based or token-based authentication (e.g., JSON Web Tokens)
  shall be used to authorise subsequent API requests.

- Role-based access control shall restrict administrator-only functions
  (rate configuration, report export, user management) from gate
  operators.

- An account shall be temporarily locked after a configurable number of
  consecutive failed login attempts.

- All authentication events (successful and failed) shall be logged for
  audit purposes.

<u>9. Database Requirements</u>

The system requires a relational database to maintain consistency
between slot occupancy, active parking sessions, and generated bills.
The principal entities and their relationships are illustrated below.

<img src="parking_md/media/336a476c1b4c76ba0a259d029518787009c89966.png"
style="width:3.67708in;height:5in" />

*Figure 9.1 — Entity Relationship Overview*

*<u>9.1 Key Entities</u>*

- Vehicle — stores the vehicle registration number and vehicle category
  (car/scooter).

- Slot — stores the slot identifier, category, location code, and
  current status (vacant/occupied).

- Parking Session — stores the vehicle, allocated slot, in-time,
  out-time, and session status; created at entry and closed at exit.

- Rate Master — stores the hourly rate applicable to each vehicle
  category, configurable by the administrator.

- Bill/Receipt — stores the computed duration, amount, and generation
  timestamp for each completed session.

- Admin User — stores administrator and operator credentials and
  assigned role.

*<u>9.2 Data Retention</u>*

Parking session and billing records shall be retained for a minimum of
twelve months to support reporting, reconciliation, and audit
requirements, after which older records may be archived.

<u>10. API Requirements</u>

The backend shall expose a RESTful API consumed by the entry/exit units,
the display board, and the administration panel. Representative
endpoints are listed below; the complete specification will be finalised
during the API design phase.

| Method | Endpoint              | Description                                                                                  |
|--------|-----------------------|----------------------------------------------------------------------------------------------|
| POST   | /api/v1/entries       | Register a vehicle entry (vehicle number, category, in-time) and allocate a slot.            |
| POST   | /api/v1/exits         | Register a vehicle exit (vehicle number, out-time), close the session, and compute the bill. |
| GET    | /api/v1/availability  | Retrieve live count of available car slots, scooter slots, and total slots.                  |
| GET    | /api/v1/sessions/{id} | Retrieve details of a specific parking session.                                              |
| GET    | /api/v1/receipts/{id} | Retrieve or reprint a generated receipt.                                                     |
| POST   | /api/v1/auth/login    | Authenticate an administrator/operator and issue an access token.                            |
| GET    | /api/v1/rates         | Retrieve current hourly rates by vehicle category.                                           |
| PUT    | /api/v1/rates/{id}    | Update the hourly rate for a vehicle category (administrator only).                          |
| GET    | /api/v1/reports       | Retrieve occupancy and revenue reports for a specified date range.                           |

<u>11. Frontend Requirements</u>

*<u>11.1 Digital Availability Display</u>*

- Present the number of car slots left, scooter slots left, and total
  slots left in large, legible text suitable for outdoor/kiosk viewing.

- Refresh automatically upon every entry and exit event without
  requiring manual reload.

*<u>11.2 Administration Application</u>*

- Provide a native Android application, developed using Android Studio,
  for use by administrators and gate operators on tablet or handheld
  devices.

- Provide screens for dashboard summary, slot management, rate
  configuration, session history, and reports.

- Follow a consistent, uncluttered visual layout with clear labelling of
  all fields and actions.

<u>12. Backend Requirements</u>

- Expose the API endpoints defined in Section 10 and enforce business
  rules (slot availability, duplicate-entry prevention, rate
  application) centrally on the server.

- Maintain slot occupancy counts consistently under concurrent
  entry/exit requests (e.g., using database transactions or row-level
  locking).

- Compute billing duration and amount deterministically from stored
  in-time and out-time values.

- Provide scheduled or on-demand aggregation jobs to generate the
  reports described in Section 17.

- Log all entry, exit, and administrative actions for traceability.

<u>13. Admin Panel Requirements</u>

- Dashboard showing current occupancy (by category), today's revenue,
  and the most recent transactions.

- Slot management screen to add, edit, deactivate, or reassign parking
  slots.

- Rate configuration screen to view and update the hourly rate for each
  vehicle category, with a change history.

- Session history screen with search and filter by vehicle number, date
  range, and vehicle category.

- User management screen (administrator only) to create and manage
  operator accounts and roles.

- Report generation screen to view and export the reports described in
  Section 17.

<u>14. Validation & Error Handling</u>

- Vehicle registration numbers shall be validated against a standard
  format before being accepted at entry.

- An attempt to register an entry for a vehicle number already marked
  "inside" the facility shall be rejected with a clear error message.

- An attempt to register an exit for a vehicle number not currently
  marked "inside" the facility shall be rejected with a clear error
  message.

- If automated capture (ANPR/RFID) fails, the system shall permit manual
  entry of the vehicle number by the gate operator.

- If a required slot category is unavailable, the system shall display
  an appropriate "Parking Full" message and deny entry.

- All API requests shall be validated for required fields and correct
  data types before processing, and shall return descriptive error
  responses on failure.

- System and hardware faults (e.g., sensor or barrier communication
  failure) shall be logged and flagged to the administrator.

<u>15. Security Requirements</u>

- All communication between client applications, the display board, and
  the backend server shall be encrypted using HTTPS/TLS.

- Administrator and operator passwords shall be hashed using a strong,
  salted algorithm; they shall never be stored or transmitted in plain
  text.

- Role-based access control shall be enforced on every API endpoint that
  performs an administrative action.

- Access and administrative-action logs shall be immutable and retained
  for audit purposes.

- Input validation and parameterised database queries shall be used
  throughout to prevent injection attacks.

- Regular backups of the database shall be scheduled to prevent loss of
  transaction and billing data.

<u>16. Notifications & Third-Party Integrations</u>

- Integration with an ANPR (Automatic Number Plate Recognition) camera
  or RFID reader for automated vehicle identification at entry and exit.

- Integration with a thermal/receipt printer for issuing a physical
  ticket/receipt, with an option to display a digital equivalent.

- Integration with the boom barrier controller to open/close the entry
  and exit barriers based on system decisions.

- Optional SMS/email notification to a registered vehicle owner
  containing the digital receipt (identified as a future enhancement,
  see Section 21).

- Optional integration with a payment gateway for cashless payment of
  parking charges (identified as a future enhancement, see Section 21).

<u>17. Reports & Dashboard Requirements</u>

- Daily, weekly, and monthly revenue reports, broken down by vehicle
  category.

- Occupancy reports showing average and peak utilisation of car and
  scooter slots over a selected period.

- Average duration of stay, by vehicle category, over a selected period.

- A real-time dashboard summarising current occupancy, today's revenue,
  and the most recent transactions.

- Ability to export any report in CSV or PDF format for offline
  record-keeping.

<u>18. Non-Functional Requirements</u>

| Attribute       | Requirement                                                                                                                                   |
|-----------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| Performance     | The system shall update the availability display within two seconds of an entry or exit event under normal operating load.                    |
| Scalability     | The architecture shall support extension to additional entry/exit points and additional facilities without redesign.                          |
| Availability    | The core entry/exit and billing functions shall be available during all operating hours of the facility, targeting at least 99% uptime.       |
| Usability       | The display board and admin panel shall present information clearly and require minimal training for gate operators.                          |
| Maintainability | The system shall be developed in a modular fashion to allow individual modules to be updated independently.                                   |
| Reliability     | In the event of a network interruption, the entry/exit units shall queue captured data locally and synchronise once connectivity is restored. |
| Portability     | The admin application shall function correctly on current supported versions of the Android operating system.                                 |

<u>19. Technology Stack</u>

The following technology stack is proposed for the implementation of the
system; the final selection will be confirmed during the technical
design phase.

| Layer                        | Proposed Technology                                                                                                               |
|------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| Frontend (Admin Application) | Android Studio (native Android application, Java/Kotlin)                                                                          |
| Display Board Interface      | Lightweight web application rendered on an embedded/kiosk browser                                                                 |
| Backend / API                | Node.js with Prisma ORM (REST API)                                                                                                |
| Database                     | PostgreSQL (relational database)                                                                                                  |
| Hardware                     | ANPR camera or RFID reader, IR/ultrasonic slot occupancy sensors, boom barrier controller, LED/LCD display board, receipt printer |
| Hosting/Infrastructure       | On-premise edge server at the facility with optional cloud synchronisation for reporting                                          |

<u>20. Deployment Requirements</u>

- Installation of ANPR camera/RFID readers and occupancy sensors at each
  entry, exit, and slot location.

- Installation of the digital display board below the existing billboard
  at a location visible to arriving vehicles.

- Deployment of the application server on-premise or on a cloud instance
  reachable by all hardware units.

- Configuration of network connectivity (wired or wireless) between
  hardware units and the application server.

- Initial configuration of slot inventory, vehicle categories, and
  hourly rates prior to go-live.

- A staged rollout consisting of a pilot at one entry/exit point,
  followed by full deployment across the facility.

<u>21. Future Enhancements</u>

- A mobile application allowing vehicle owners to view live availability
  and pre-book a slot.

- Integration with a payment gateway for cashless, contactless payment
  of parking charges.

- SMS/email delivery of the digital receipt to the vehicle owner.

- Dynamic/demand-based pricing during peak hours.

- Support for additional vehicle categories, including electric vehicles
  with charging-slot management.

- Multi-facility support with centralised, cloud-based reporting across
  locations.

<u>22. Assumptions & Dependencies</u>

*<u>22.1 Assumptions</u>*

- Each parking bay is permanently designated for a single vehicle
  category (car or scooter) and does not change dynamically.

- A stable power and network connection is available at the facility for
  the display board and hardware units.

- Vehicle owners will comply with the entry/exit process directed by the
  system and gate signage.

*<u>22.2 Dependencies</u>*

- Availability and accuracy of ANPR/RFID hardware for automated vehicle
  identification.

- Timely installation of physical infrastructure (display board,
  sensors, barrier) by the facility management.

- Finalisation of hourly billing rates by the facility administrator
  prior to go-live.

<u>23. Requirement Approval / Sign-off</u>

This document represents the requirements agreed upon for the Smart
Parking Management System as discussed. Development activities (database
design, API design, backend and frontend development, integration,
testing, and deployment) shall commence only after this document has
been reviewed and formally approved by the parties below.

| Role        | Name | Signature | Date |
|-------------|------|-----------|------|
| Reviewed By |      |           |      |
| Approved By |      |           |      |
