import { Site, ParkingSlot, ParkingSession, DeactivationEvent, RateItem, RateHistoryItem, OperatorAccount, UserAccount, QuickAlert, ReportData } from '../types';

export const initialSites: Site[] = [
  {
    "id": "site-hadapsar",
    "name": "AeroPark – Hadapsar",
    "address": "Plot 42, Magarpatta Road, Hadapsar Industrial Estate, Pune, Maharashtra 411028",
    "gateInfo": "Terminal 2 • Gates 1 & 2 (North Entry)",
    "totalCarSlots": 40,
    "totalScooterSlots": 20,
    "defaultCarRate": 30,
    "defaultScooterRate": 15,
    "status": "Active"
  },
  {
    "id": "site-camp",
    "name": "AeroPark – Camp",
    "address": "14/B East Street, Near Wonderland, Camp, Pune, Maharashtra 411001",
    "gateInfo": "Main Plaza Gate • ANPR Lane 1 & 2",
    "totalCarSlots": 30,
    "totalScooterSlots": 15,
    "defaultCarRate": 40,
    "defaultScooterRate": 20,
    "status": "Active"
  },
  {
    "id": "site-kothrud",
    "name": "AeroPark – Kothrud",
    "address": "Paud Road, Ideal Colony, Kothrud, Pune, Maharashtra 411038",
    "gateInfo": "Phase 1 Construction Gates",
    "totalCarSlots": 50,
    "totalScooterSlots": 25,
    "defaultCarRate": 30,
    "defaultScooterRate": 15,
    "status": "Coming Soon"
  }
];

export const initialRates: RateItem[] = [
  {
    "id": "rate-hadapsar-car",
    "siteId": "site-hadapsar",
    "category": "Car",
    "hourlyRate": 30,
    "lastUpdatedAt": "01-Sep-2026, 10:30 AM",
    "lastUpdatedBy": "Rajesh Sharma (Admin)"
  },
  {
    "id": "rate-hadapsar-scooter",
    "siteId": "site-hadapsar",
    "category": "Scooter",
    "hourlyRate": 15,
    "lastUpdatedAt": "25-Aug-2026, 04:15 PM",
    "lastUpdatedBy": "Rajesh Sharma (Admin)"
  },
  {
    "id": "rate-camp-car",
    "siteId": "site-camp",
    "category": "Car",
    "hourlyRate": 40,
    "lastUpdatedAt": "02-Sep-2026, 11:00 AM",
    "lastUpdatedBy": "Rajesh Sharma (Admin)"
  },
  {
    "id": "rate-camp-scooter",
    "siteId": "site-camp",
    "category": "Scooter",
    "hourlyRate": 20,
    "lastUpdatedAt": "02-Sep-2026, 11:00 AM",
    "lastUpdatedBy": "Rajesh Sharma (Admin)"
  }
];

export const initialRateHistory: RateHistoryItem[] = [
  {
    "id": "hist-1",
    "siteId": "site-hadapsar",
    "date": "01-Sep-2026, 10:30 AM",
    "category": "Car",
    "oldRate": 25,
    "newRate": 30,
    "changedBy": "Rajesh Sharma"
  },
  {
    "id": "hist-2",
    "siteId": "site-hadapsar",
    "date": "25-Aug-2026, 04:15 PM",
    "category": "Scooter",
    "oldRate": 10,
    "newRate": 15,
    "changedBy": "Rajesh Sharma"
  },
  {
    "id": "hist-3",
    "siteId": "site-camp",
    "date": "02-Sep-2026, 11:00 AM",
    "category": "Car",
    "oldRate": 35,
    "newRate": 40,
    "changedBy": "Rajesh Sharma"
  }
];

export const initialDeactivationEvents: DeactivationEvent[] = [
  {
    "id": "deact-1",
    "slotId": "C-08",
    "siteId": "site-hadapsar",
    "action": "deactivate",
    "reason": "Surface oil leak maintenance and bay repaint",
    "actionedBy": "Rajesh Sharma",
    "actionedAt": "03-Sep-2026, 02:30 PM"
  },
  {
    "id": "deact-2",
    "slotId": "S-05",
    "siteId": "site-hadapsar",
    "action": "deactivate",
    "reason": "Overhead LED luminaire repair",
    "actionedBy": "Rajesh Sharma",
    "actionedAt": "02-Sep-2026, 09:15 AM"
  },
  {
    "id": "deact-3",
    "slotId": "S-05",
    "siteId": "site-hadapsar",
    "action": "reactivate",
    "reason": "Luminaire repaired and verified operational",
    "actionedBy": "Rajesh Sharma",
    "actionedAt": "02-Sep-2026, 04:45 PM"
  }
];

export const initialOperators: OperatorAccount[] = [
  {
    "id": "op-1",
    "name": "Suresh Patil",
    "username": "suresh.patil",
    "contact": "+91 98230 11234",
    "assignedSiteId": "site-hadapsar",
    "status": "Active",
    "dateAdded": "15-Jan-2026",
    "authMethod": "Google Account Linked",
    "sessionsProcessedCount": 1420,
    "reassignmentHistory": [
      {
        "id": "rh-1",
        "operatorId": "op-1",
        "fromSiteId": "site-camp",
        "fromSiteName": "AeroPark – Camp",
        "toSiteId": "site-hadapsar",
        "toSiteName": "AeroPark – Hadapsar",
        "reassignedBy": "Rajesh Sharma",
        "reassignedAt": "01-Aug-2026, 10:00 AM",
        "reason": "Shift rotation to cover North gate expansion"
      }
    ]
  },
  {
    "id": "op-2",
    "name": "Amit Deshmukh",
    "username": "amit.deshmukh",
    "contact": "+91 98450 88721",
    "assignedSiteId": "site-hadapsar",
    "status": "Active",
    "dateAdded": "01-Feb-2026",
    "authMethod": "Google Account Linked",
    "sessionsProcessedCount": 980,
    "reassignmentHistory": []
  },
  {
    "id": "op-3",
    "name": "Pooja Kulkarni",
    "username": "pooja.kulkarni",
    "contact": "+91 97632 44109",
    "assignedSiteId": "site-camp",
    "status": "Active",
    "dateAdded": "10-Mar-2026",
    "authMethod": "Google Account Linked",
    "sessionsProcessedCount": 1150,
    "reassignmentHistory": [
      {
        "id": "rh-2",
        "operatorId": "op-3",
        "fromSiteId": "site-hadapsar",
        "fromSiteName": "AeroPark – Hadapsar",
        "toSiteId": "site-camp",
        "toSiteName": "AeroPark – Camp",
        "reassignedBy": "Rajesh Sharma",
        "reassignedAt": "15-Jul-2026, 09:30 AM",
        "reason": "Requested transfer closer to residence"
      }
    ]
  },
  {
    "id": "op-4",
    "name": "Vikas Shinde",
    "username": "vikas.shinde",
    "contact": "+91 99220 55432",
    "assignedSiteId": "site-camp",
    "status": "Terminated",
    "dateAdded": "05-Dec-2025",
    "authMethod": "Google Account Linked",
    "sessionsProcessedCount": 420,
    "reassignmentHistory": []
  }
];

export const initialAdminUser: UserAccount = {
  "id": "usr-admin",
  "name": "Rajesh Sharma",
  "username": "rajesh.admin",
  "role": "admin",
  "status": "Active",
  "lastLogin": "04-Sep-2026, 11:32 AM"
};

export const initialSlots: ParkingSlot[] = [
  {
    "id": "C-01",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay A",
    "status": "Vacant"
  },
  {
    "id": "C-02",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay A",
    "status": "Occupied",
    "currentVehicleNumber": "MH12AB1002",
    "currentSessionId": "SES-HAD-2002"
  },
  {
    "id": "C-03",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay A",
    "status": "Vacant"
  },
  {
    "id": "C-04",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay A",
    "status": "Vacant"
  },
  {
    "id": "C-05",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay A",
    "status": "Occupied",
    "currentVehicleNumber": "MH12AB1005",
    "currentSessionId": "SES-HAD-2005"
  },
  {
    "id": "C-06",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay A",
    "status": "Occupied",
    "currentVehicleNumber": "MH12AB1006",
    "currentSessionId": "SES-HAD-2006"
  },
  {
    "id": "C-07",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay A",
    "status": "Vacant"
  },
  {
    "id": "C-08",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay A",
    "status": "Deactivated",
    "deactivationReason": "Surface oil leak maintenance and bay repaint",
    "deactivatedAt": "03-Sep-2026, 02:30 PM",
    "deactivatedBy": "Rajesh Sharma"
  },
  {
    "id": "C-09",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay A",
    "status": "Occupied",
    "currentVehicleNumber": "MH12AB1009",
    "currentSessionId": "SES-HAD-2009"
  },
  {
    "id": "C-10",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay A",
    "status": "Vacant"
  },
  {
    "id": "C-11",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay A",
    "status": "Occupied",
    "currentVehicleNumber": "MH12AB1011",
    "currentSessionId": "SES-HAD-2011"
  },
  {
    "id": "C-12",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay A",
    "status": "Vacant"
  },
  {
    "id": "C-13",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay A",
    "status": "Vacant"
  },
  {
    "id": "C-14",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay A",
    "status": "Occupied",
    "currentVehicleNumber": "MH12AB1014",
    "currentSessionId": "SES-HAD-2014"
  },
  {
    "id": "C-15",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay A",
    "status": "Vacant"
  },
  {
    "id": "C-16",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay A",
    "status": "Vacant"
  },
  {
    "id": "C-17",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay A",
    "status": "Occupied",
    "currentVehicleNumber": "MH12AB1017",
    "currentSessionId": "SES-HAD-2017"
  },
  {
    "id": "C-18",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay A",
    "status": "Occupied",
    "currentVehicleNumber": "MH12AB1018",
    "currentSessionId": "SES-HAD-2018"
  },
  {
    "id": "C-19",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay A",
    "status": "Vacant"
  },
  {
    "id": "C-20",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay A",
    "status": "Vacant"
  },
  {
    "id": "C-21",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay B",
    "status": "Vacant"
  },
  {
    "id": "C-22",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay B",
    "status": "Occupied",
    "currentVehicleNumber": "MH12AB1022",
    "currentSessionId": "SES-HAD-2022"
  },
  {
    "id": "C-23",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay B",
    "status": "Vacant"
  },
  {
    "id": "C-24",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay B",
    "status": "Vacant"
  },
  {
    "id": "C-25",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay B",
    "status": "Occupied",
    "currentVehicleNumber": "MH12AB1025",
    "currentSessionId": "SES-HAD-2025"
  },
  {
    "id": "C-26",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay B",
    "status": "Vacant"
  },
  {
    "id": "C-27",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay B",
    "status": "Occupied",
    "currentVehicleNumber": "MH12AB1027",
    "currentSessionId": "SES-HAD-2027"
  },
  {
    "id": "C-28",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay B",
    "status": "Vacant"
  },
  {
    "id": "C-29",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay B",
    "status": "Occupied",
    "currentVehicleNumber": "MH12AB1029",
    "currentSessionId": "SES-HAD-2029"
  },
  {
    "id": "C-30",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay B",
    "status": "Vacant"
  },
  {
    "id": "C-31",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay B",
    "status": "Occupied",
    "currentVehicleNumber": "MH12AB1031",
    "currentSessionId": "SES-HAD-2031"
  },
  {
    "id": "C-32",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay B",
    "status": "Vacant"
  },
  {
    "id": "C-33",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay B",
    "status": "Occupied",
    "currentVehicleNumber": "MH12AB1033",
    "currentSessionId": "SES-HAD-2033"
  },
  {
    "id": "C-34",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay B",
    "status": "Vacant"
  },
  {
    "id": "C-35",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay B",
    "status": "Occupied",
    "currentVehicleNumber": "MH12AB1035",
    "currentSessionId": "SES-HAD-2035"
  },
  {
    "id": "C-36",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay B",
    "status": "Vacant"
  },
  {
    "id": "C-37",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay B",
    "status": "Vacant"
  },
  {
    "id": "C-38",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay B",
    "status": "Occupied",
    "currentVehicleNumber": "MH12AB1038",
    "currentSessionId": "SES-HAD-2038"
  },
  {
    "id": "C-39",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay B",
    "status": "Vacant"
  },
  {
    "id": "C-40",
    "siteId": "site-hadapsar",
    "category": "Car",
    "locationCode": "Bay B",
    "status": "Vacant"
  },
  {
    "id": "S-01",
    "siteId": "site-hadapsar",
    "category": "Scooter",
    "locationCode": "Bay S",
    "status": "Occupied",
    "currentVehicleNumber": "MH12CD5001",
    "currentSessionId": "SES-HAD-3001"
  },
  {
    "id": "S-02",
    "siteId": "site-hadapsar",
    "category": "Scooter",
    "locationCode": "Bay S",
    "status": "Vacant"
  },
  {
    "id": "S-03",
    "siteId": "site-hadapsar",
    "category": "Scooter",
    "locationCode": "Bay S",
    "status": "Vacant"
  },
  {
    "id": "S-04",
    "siteId": "site-hadapsar",
    "category": "Scooter",
    "locationCode": "Bay S",
    "status": "Occupied",
    "currentVehicleNumber": "MH12CD5004",
    "currentSessionId": "SES-HAD-3004"
  },
  {
    "id": "S-05",
    "siteId": "site-hadapsar",
    "category": "Scooter",
    "locationCode": "Bay S",
    "status": "Vacant"
  },
  {
    "id": "S-06",
    "siteId": "site-hadapsar",
    "category": "Scooter",
    "locationCode": "Bay S",
    "status": "Vacant"
  },
  {
    "id": "S-07",
    "siteId": "site-hadapsar",
    "category": "Scooter",
    "locationCode": "Bay S",
    "status": "Occupied",
    "currentVehicleNumber": "MH12CD5007",
    "currentSessionId": "SES-HAD-3007"
  },
  {
    "id": "S-08",
    "siteId": "site-hadapsar",
    "category": "Scooter",
    "locationCode": "Bay S",
    "status": "Vacant"
  },
  {
    "id": "S-09",
    "siteId": "site-hadapsar",
    "category": "Scooter",
    "locationCode": "Bay S",
    "status": "Occupied",
    "currentVehicleNumber": "MH12CD5009",
    "currentSessionId": "SES-HAD-3009"
  },
  {
    "id": "S-10",
    "siteId": "site-hadapsar",
    "category": "Scooter",
    "locationCode": "Bay S",
    "status": "Vacant"
  },
  {
    "id": "S-11",
    "siteId": "site-hadapsar",
    "category": "Scooter",
    "locationCode": "Bay S",
    "status": "Vacant"
  },
  {
    "id": "S-12",
    "siteId": "site-hadapsar",
    "category": "Scooter",
    "locationCode": "Bay S",
    "status": "Occupied",
    "currentVehicleNumber": "MH12CD5012",
    "currentSessionId": "SES-HAD-3012"
  },
  {
    "id": "S-13",
    "siteId": "site-hadapsar",
    "category": "Scooter",
    "locationCode": "Bay S",
    "status": "Vacant"
  },
  {
    "id": "S-14",
    "siteId": "site-hadapsar",
    "category": "Scooter",
    "locationCode": "Bay S",
    "status": "Vacant"
  },
  {
    "id": "S-15",
    "siteId": "site-hadapsar",
    "category": "Scooter",
    "locationCode": "Bay S",
    "status": "Occupied",
    "currentVehicleNumber": "MH12CD5015",
    "currentSessionId": "SES-HAD-3015"
  },
  {
    "id": "S-16",
    "siteId": "site-hadapsar",
    "category": "Scooter",
    "locationCode": "Bay S",
    "status": "Vacant"
  },
  {
    "id": "S-17",
    "siteId": "site-hadapsar",
    "category": "Scooter",
    "locationCode": "Bay S",
    "status": "Vacant"
  },
  {
    "id": "S-18",
    "siteId": "site-hadapsar",
    "category": "Scooter",
    "locationCode": "Bay S",
    "status": "Occupied",
    "currentVehicleNumber": "MH12CD5018",
    "currentSessionId": "SES-HAD-3018"
  },
  {
    "id": "S-19",
    "siteId": "site-hadapsar",
    "category": "Scooter",
    "locationCode": "Bay S",
    "status": "Vacant"
  },
  {
    "id": "S-20",
    "siteId": "site-hadapsar",
    "category": "Scooter",
    "locationCode": "Bay S",
    "status": "Vacant"
  },
  {
    "id": "CMP-C01",
    "siteId": "site-camp",
    "category": "Car",
    "locationCode": "Ground West",
    "status": "Occupied",
    "currentVehicleNumber": "MH14XY2001",
    "currentSessionId": "SES-CMP-4001"
  },
  {
    "id": "CMP-C02",
    "siteId": "site-camp",
    "category": "Car",
    "locationCode": "Ground West",
    "status": "Vacant"
  },
  {
    "id": "CMP-C03",
    "siteId": "site-camp",
    "category": "Car",
    "locationCode": "Ground West",
    "status": "Occupied",
    "currentVehicleNumber": "MH14XY2003",
    "currentSessionId": "SES-CMP-4003"
  },
  {
    "id": "CMP-C04",
    "siteId": "site-camp",
    "category": "Car",
    "locationCode": "Ground West",
    "status": "Vacant"
  },
  {
    "id": "CMP-C05",
    "siteId": "site-camp",
    "category": "Car",
    "locationCode": "Ground West",
    "status": "Vacant"
  },
  {
    "id": "CMP-C06",
    "siteId": "site-camp",
    "category": "Car",
    "locationCode": "Ground West",
    "status": "Vacant"
  },
  {
    "id": "CMP-C07",
    "siteId": "site-camp",
    "category": "Car",
    "locationCode": "Ground West",
    "status": "Occupied",
    "currentVehicleNumber": "MH14XY2007",
    "currentSessionId": "SES-CMP-4007"
  },
  {
    "id": "CMP-C08",
    "siteId": "site-camp",
    "category": "Car",
    "locationCode": "Ground West",
    "status": "Vacant"
  },
  {
    "id": "CMP-C09",
    "siteId": "site-camp",
    "category": "Car",
    "locationCode": "Ground West",
    "status": "Vacant"
  },
  {
    "id": "CMP-C10",
    "siteId": "site-camp",
    "category": "Car",
    "locationCode": "Ground West",
    "status": "Occupied",
    "currentVehicleNumber": "MH14XY2010",
    "currentSessionId": "SES-CMP-4010"
  },
  {
    "id": "CMP-C11",
    "siteId": "site-camp",
    "category": "Car",
    "locationCode": "Ground West",
    "status": "Vacant"
  },
  {
    "id": "CMP-C12",
    "siteId": "site-camp",
    "category": "Car",
    "locationCode": "Ground West",
    "status": "Occupied",
    "currentVehicleNumber": "MH14XY2012",
    "currentSessionId": "SES-CMP-4012"
  },
  {
    "id": "CMP-C13",
    "siteId": "site-camp",
    "category": "Car",
    "locationCode": "Ground West",
    "status": "Vacant"
  },
  {
    "id": "CMP-C14",
    "siteId": "site-camp",
    "category": "Car",
    "locationCode": "Ground West",
    "status": "Vacant"
  },
  {
    "id": "CMP-C15",
    "siteId": "site-camp",
    "category": "Car",
    "locationCode": "Ground West",
    "status": "Occupied",
    "currentVehicleNumber": "MH14XY2015",
    "currentSessionId": "SES-CMP-4015"
  },
  {
    "id": "CMP-C16",
    "siteId": "site-camp",
    "category": "Car",
    "locationCode": "Ground East",
    "status": "Vacant"
  },
  {
    "id": "CMP-C17",
    "siteId": "site-camp",
    "category": "Car",
    "locationCode": "Ground East",
    "status": "Vacant"
  },
  {
    "id": "CMP-C18",
    "siteId": "site-camp",
    "category": "Car",
    "locationCode": "Ground East",
    "status": "Occupied",
    "currentVehicleNumber": "MH14XY2018",
    "currentSessionId": "SES-CMP-4018"
  },
  {
    "id": "CMP-C19",
    "siteId": "site-camp",
    "category": "Car",
    "locationCode": "Ground East",
    "status": "Vacant"
  },
  {
    "id": "CMP-C20",
    "siteId": "site-camp",
    "category": "Car",
    "locationCode": "Ground East",
    "status": "Occupied",
    "currentVehicleNumber": "MH14XY2020",
    "currentSessionId": "SES-CMP-4020"
  },
  {
    "id": "CMP-C21",
    "siteId": "site-camp",
    "category": "Car",
    "locationCode": "Ground East",
    "status": "Vacant"
  },
  {
    "id": "CMP-C22",
    "siteId": "site-camp",
    "category": "Car",
    "locationCode": "Ground East",
    "status": "Vacant"
  },
  {
    "id": "CMP-C23",
    "siteId": "site-camp",
    "category": "Car",
    "locationCode": "Ground East",
    "status": "Vacant"
  },
  {
    "id": "CMP-C24",
    "siteId": "site-camp",
    "category": "Car",
    "locationCode": "Ground East",
    "status": "Vacant"
  },
  {
    "id": "CMP-C25",
    "siteId": "site-camp",
    "category": "Car",
    "locationCode": "Ground East",
    "status": "Vacant"
  },
  {
    "id": "CMP-C26",
    "siteId": "site-camp",
    "category": "Car",
    "locationCode": "Ground East",
    "status": "Vacant"
  },
  {
    "id": "CMP-C27",
    "siteId": "site-camp",
    "category": "Car",
    "locationCode": "Ground East",
    "status": "Vacant"
  },
  {
    "id": "CMP-C28",
    "siteId": "site-camp",
    "category": "Car",
    "locationCode": "Ground East",
    "status": "Vacant"
  },
  {
    "id": "CMP-C29",
    "siteId": "site-camp",
    "category": "Car",
    "locationCode": "Ground East",
    "status": "Vacant"
  },
  {
    "id": "CMP-C30",
    "siteId": "site-camp",
    "category": "Car",
    "locationCode": "Ground East",
    "status": "Vacant"
  },
  {
    "id": "CMP-S01",
    "siteId": "site-camp",
    "category": "Scooter",
    "locationCode": "Two-Wheeler Zone",
    "status": "Vacant"
  },
  {
    "id": "CMP-S02",
    "siteId": "site-camp",
    "category": "Scooter",
    "locationCode": "Two-Wheeler Zone",
    "status": "Occupied",
    "currentVehicleNumber": "MH14ZZ6002",
    "currentSessionId": "SES-CMP-5002"
  },
  {
    "id": "CMP-S03",
    "siteId": "site-camp",
    "category": "Scooter",
    "locationCode": "Two-Wheeler Zone",
    "status": "Vacant"
  },
  {
    "id": "CMP-S04",
    "siteId": "site-camp",
    "category": "Scooter",
    "locationCode": "Two-Wheeler Zone",
    "status": "Vacant"
  },
  {
    "id": "CMP-S05",
    "siteId": "site-camp",
    "category": "Scooter",
    "locationCode": "Two-Wheeler Zone",
    "status": "Occupied",
    "currentVehicleNumber": "MH14ZZ6005",
    "currentSessionId": "SES-CMP-5005"
  },
  {
    "id": "CMP-S06",
    "siteId": "site-camp",
    "category": "Scooter",
    "locationCode": "Two-Wheeler Zone",
    "status": "Vacant"
  },
  {
    "id": "CMP-S07",
    "siteId": "site-camp",
    "category": "Scooter",
    "locationCode": "Two-Wheeler Zone",
    "status": "Vacant"
  },
  {
    "id": "CMP-S08",
    "siteId": "site-camp",
    "category": "Scooter",
    "locationCode": "Two-Wheeler Zone",
    "status": "Occupied",
    "currentVehicleNumber": "MH14ZZ6008",
    "currentSessionId": "SES-CMP-5008"
  },
  {
    "id": "CMP-S09",
    "siteId": "site-camp",
    "category": "Scooter",
    "locationCode": "Two-Wheeler Zone",
    "status": "Vacant"
  },
  {
    "id": "CMP-S10",
    "siteId": "site-camp",
    "category": "Scooter",
    "locationCode": "Two-Wheeler Zone",
    "status": "Vacant"
  },
  {
    "id": "CMP-S11",
    "siteId": "site-camp",
    "category": "Scooter",
    "locationCode": "Two-Wheeler Zone",
    "status": "Occupied",
    "currentVehicleNumber": "MH14ZZ6011",
    "currentSessionId": "SES-CMP-5011"
  },
  {
    "id": "CMP-S12",
    "siteId": "site-camp",
    "category": "Scooter",
    "locationCode": "Two-Wheeler Zone",
    "status": "Vacant"
  },
  {
    "id": "CMP-S13",
    "siteId": "site-camp",
    "category": "Scooter",
    "locationCode": "Two-Wheeler Zone",
    "status": "Vacant"
  },
  {
    "id": "CMP-S14",
    "siteId": "site-camp",
    "category": "Scooter",
    "locationCode": "Two-Wheeler Zone",
    "status": "Vacant"
  },
  {
    "id": "CMP-S15",
    "siteId": "site-camp",
    "category": "Scooter",
    "locationCode": "Two-Wheeler Zone",
    "status": "Vacant"
  }
];

export const initialSessions: ParkingSession[] = [
  {
    "id": "SES-HAD-2001",
    "siteId": "site-hadapsar",
    "vehicleNumber": "MH12DE1432",
    "category": "Car",
    "slotId": "C-02",
    "inTime": "04-Sep-2026, 08:30 AM",
    "outTime": null,
    "durationMinutes": 195,
    "amount": null,
    "status": "Active",
    "rateApplied": 30
  },
  {
    "id": "SES-HAD-2002",
    "siteId": "site-hadapsar",
    "vehicleNumber": "MH14EU8821",
    "category": "Car",
    "slotId": "C-05",
    "inTime": "04-Sep-2026, 09:15 AM",
    "outTime": null,
    "durationMinutes": 150,
    "amount": null,
    "status": "Active",
    "rateApplied": 30
  },
  {
    "id": "SES-HAD-2003",
    "siteId": "site-hadapsar",
    "vehicleNumber": "MH12QA5541",
    "category": "Scooter",
    "slotId": "S-01",
    "inTime": "04-Sep-2026, 09:40 AM",
    "outTime": null,
    "durationMinutes": 125,
    "amount": null,
    "status": "Active",
    "rateApplied": 15
  },
  {
    "id": "SES-HAD-2004",
    "siteId": "site-hadapsar",
    "vehicleNumber": "MH12AB1234",
    "category": "Car",
    "slotId": "C-14",
    "inTime": "04-Sep-2026, 09:12 AM",
    "outTime": "04-Sep-2026, 11:45 AM",
    "durationMinutes": 153,
    "amount": 76.5,
    "status": "Completed",
    "rateApplied": 30
  },
  {
    "id": "SES-HAD-2005",
    "siteId": "site-hadapsar",
    "vehicleNumber": "MH12BK9087",
    "category": "Car",
    "slotId": "C-22",
    "inTime": "04-Sep-2026, 08:00 AM",
    "outTime": "04-Sep-2026, 10:35 AM",
    "durationMinutes": 155,
    "amount": 77.5,
    "status": "Completed",
    "rateApplied": 30
  },
  {
    "id": "SES-HAD-2006",
    "siteId": "site-hadapsar",
    "vehicleNumber": "MH12XY7612",
    "category": "Scooter",
    "slotId": "S-07",
    "inTime": "04-Sep-2026, 07:45 AM",
    "outTime": "04-Sep-2026, 11:15 AM",
    "durationMinutes": 210,
    "amount": 52.5,
    "status": "Completed",
    "rateApplied": 15
  },
  {
    "id": "SES-HAD-2007",
    "siteId": "site-hadapsar",
    "vehicleNumber": "MH14MN3399",
    "category": "Car",
    "slotId": "C-17",
    "inTime": "04-Sep-2026, 07:30 AM",
    "outTime": "04-Sep-2026, 09:00 AM",
    "durationMinutes": 90,
    "amount": 45,
    "status": "Completed",
    "rateApplied": 30
  },
  {
    "id": "SES-HAD-2008",
    "siteId": "site-hadapsar",
    "vehicleNumber": "MH12LM4567",
    "category": "Scooter",
    "slotId": "S-04",
    "inTime": "03-Sep-2026, 02:15 PM",
    "outTime": "03-Sep-2026, 05:40 PM",
    "durationMinutes": 205,
    "amount": 51.25,
    "status": "Completed",
    "rateApplied": 15
  },
  {
    "id": "SES-HAD-2009",
    "siteId": "site-hadapsar",
    "vehicleNumber": "MH12KK8800",
    "category": "Car",
    "slotId": "C-08",
    "inTime": "03-Sep-2026, 10:00 AM",
    "outTime": "03-Sep-2026, 01:15 PM",
    "durationMinutes": 195,
    "amount": 97.5,
    "status": "Completed",
    "rateApplied": 30
  },
  {
    "id": "SES-HAD-2010",
    "siteId": "site-hadapsar",
    "vehicleNumber": "MH12OP1122",
    "category": "Car",
    "slotId": "C-11",
    "inTime": "03-Sep-2026, 11:30 AM",
    "outTime": "03-Sep-2026, 02:50 PM",
    "durationMinutes": 200,
    "amount": 100,
    "status": "Completed",
    "rateApplied": 30
  },
  {
    "id": "SES-CMP-4001",
    "siteId": "site-camp",
    "vehicleNumber": "MH14XY2001",
    "category": "Car",
    "slotId": "CMP-C01",
    "inTime": "04-Sep-2026, 09:00 AM",
    "outTime": null,
    "durationMinutes": 160,
    "amount": null,
    "status": "Active",
    "rateApplied": 40
  },
  {
    "id": "SES-CMP-4002",
    "siteId": "site-camp",
    "vehicleNumber": "MH14TR8899",
    "category": "Car",
    "slotId": "CMP-C04",
    "inTime": "04-Sep-2026, 08:15 AM",
    "outTime": "04-Sep-2026, 10:45 AM",
    "durationMinutes": 150,
    "amount": 100,
    "status": "Completed",
    "rateApplied": 40
  },
  {
    "id": "SES-CMP-5001",
    "siteId": "site-camp",
    "vehicleNumber": "MH14ZZ6002",
    "category": "Scooter",
    "slotId": "CMP-S02",
    "inTime": "04-Sep-2026, 10:00 AM",
    "outTime": "04-Sep-2026, 11:40 AM",
    "durationMinutes": 100,
    "amount": 33.33,
    "status": "Completed",
    "rateApplied": 20
  }
];

export const initialAlerts: QuickAlert[] = [
  {
    "id": "alt-1",
    "siteId": "site-hadapsar",
    "severity": "warning",
    "title": "Slot C-08 Deactivated",
    "message": "Bay out of service for surface oil cleanup and repainting.",
    "timestamp": "Today, 02:30 PM"
  },
  {
    "id": "alt-2",
    "siteId": "site-hadapsar",
    "severity": "info",
    "title": "Peak Inflow Detected",
    "message": "Car bays reached 60% occupancy during morning rush hours.",
    "timestamp": "Today, 09:30 AM"
  },
  {
    "id": "alt-3",
    "siteId": "site-camp",
    "severity": "info",
    "title": "Camera Lens Cleaned",
    "message": "ANPR Lane 1 routine optical maintenance completed.",
    "timestamp": "Yesterday, 06:00 PM"
  }
];

export const revenueReportData: ReportData = {
  "type": "Revenue",
  "dataPoints": [
    {
      "label": "29-Aug",
      "value": 6840,
      "secondaryValue": 2180
    },
    {
      "label": "30-Aug",
      "value": 7210,
      "secondaryValue": 2340
    },
    {
      "label": "31-Aug",
      "value": 8120,
      "secondaryValue": 2560
    },
    {
      "label": "01-Sep",
      "value": 7850,
      "secondaryValue": 2490
    },
    {
      "label": "02-Sep",
      "value": 8640,
      "secondaryValue": 2710
    },
    {
      "label": "03-Sep",
      "value": 9110,
      "secondaryValue": 2890
    },
    {
      "label": "04-Sep (Today)",
      "value": 6450,
      "secondaryValue": 1980
    }
  ],
  "summary": {
    "totalRevenue": 54220,
    "peakOccupancyPct": 82,
    "avgDurationMinutes": 142,
    "totalTransactions": 614
  }
};

export const occupancyReportData: ReportData = {
  "type": "Occupancy",
  "dataPoints": [
    {
      "label": "08:00 AM",
      "value": 34
    },
    {
      "label": "10:00 AM",
      "value": 78
    },
    {
      "label": "12:00 PM",
      "value": 85
    },
    {
      "label": "02:00 PM",
      "value": 68
    },
    {
      "label": "04:00 PM",
      "value": 74
    },
    {
      "label": "06:00 PM",
      "value": 89
    },
    {
      "label": "08:00 PM",
      "value": 45
    }
  ],
  "summary": {
    "totalRevenue": 54220,
    "peakOccupancyPct": 89,
    "avgDurationMinutes": 142,
    "totalTransactions": 614
  }
};

export const durationReportData: ReportData = {
  "type": "Duration",
  "dataPoints": [
    {
      "label": "< 1 hr",
      "value": 112,
      "secondaryValue": 74
    },
    {
      "label": "1 - 2 hrs",
      "value": 245,
      "secondaryValue": 98
    },
    {
      "label": "2 - 3 hrs",
      "value": 184,
      "secondaryValue": 51
    },
    {
      "label": "3 - 4 hrs",
      "value": 62,
      "secondaryValue": 19
    },
    {
      "label": "> 4 hrs",
      "value": 11,
      "secondaryValue": 4
    }
  ],
  "summary": {
    "totalRevenue": 54220,
    "peakOccupancyPct": 89,
    "avgDurationMinutes": 142,
    "totalTransactions": 614
  }
};

export const transactionsReportData: ReportData = {
  "type": "Transactions",
  "dataPoints": [
    {
      "label": "29-Aug",
      "value": 82,
      "secondaryValue": 52
    },
    {
      "label": "30-Aug",
      "value": 88,
      "secondaryValue": 56
    },
    {
      "label": "31-Aug",
      "value": 96,
      "secondaryValue": 62
    },
    {
      "label": "01-Sep",
      "value": 94,
      "secondaryValue": 60
    },
    {
      "label": "02-Sep",
      "value": 104,
      "secondaryValue": 68
    },
    {
      "label": "03-Sep",
      "value": 110,
      "secondaryValue": 72
    },
    {
      "label": "04-Sep (Today)",
      "value": 84,
      "secondaryValue": 46
    }
  ],
  "summary": {
    "totalRevenue": 54220,
    "peakOccupancyPct": 89,
    "avgDurationMinutes": 142,
    "totalTransactions": 1074
  }
};
