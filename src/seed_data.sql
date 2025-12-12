-- =====================================================
-- seed_data.sql – Shaheen Insurance demo seed data
-- =====================================================

-- Make sure you're in the right DB
-- USE shaheen_app;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------
-- 1) STATIC / LOOKUP TABLES
-- -----------------------------------------------------

-- CITIES
DELETE FROM cities;

INSERT INTO cities (id, name, created_at, updated_at) VALUES
(1, 'Karachi',        NOW(), NOW()),
(2, 'Lahore',         NOW(), NOW()),
(3, 'Islamabad',      NOW(), NOW()),
(4, 'Rawalpindi',     NOW(), NOW()),
(5, 'Peshawar',       NOW(), NOW());

ALTER TABLE cities AUTO_INCREMENT = 6;

-- VEHICLE MAKES
DELETE FROM vehicle_makes;

INSERT INTO vehicle_makes (id, name, created_at, updated_at) VALUES
(1, 'Toyota', NOW(), NOW()),
(2, 'Honda',  NOW(), NOW()),
(3, 'Suzuki', NOW(), NOW());

ALTER TABLE vehicle_makes AUTO_INCREMENT = 4;

-- VEHICLE SUBMAKES
DELETE FROM vehicle_submakes;

INSERT INTO vehicle_submakes (id, make_id, name, created_at, updated_at) VALUES
(1, 1, 'Corolla', NOW(), NOW()),
(2, 1, 'Yaris',   NOW(), NOW()),
(3, 2, 'Civic',   NOW(), NOW()),
(4, 2, 'City',    NOW(), NOW()),
(5, 3, 'Alto',    NOW(), NOW()),
(6, 3, 'Cultus',  NOW(), NOW());

ALTER TABLE vehicle_submakes AUTO_INCREMENT = 7;

-- TRACKER COMPANIES
DELETE FROM tracker_companies;

INSERT INTO tracker_companies (id, name, created_at, updated_at) VALUES
(1, 'TPL Trakker',        NOW(), NOW()),
(2, 'Falcon-i',           NOW(), NOW()),
(3, 'Shaheen Tracker A',  NOW(), NOW());

ALTER TABLE tracker_companies AUTO_INCREMENT = 4;

-- TRAVEL DESTINATIONS (for travel_destinations_selected)
DELETE FROM travel_destinations;

INSERT INTO travel_destinations (id, name, region, created_at, updated_at) VALUES
(1, 'United Arab Emirates', 'Middle East',      NOW(), NOW()),
(2, 'Saudi Arabia',         'Middle East',      NOW(), NOW()),
(3, 'Turkey',               'Europe/Asia',      NOW(), NOW()),
(4, 'United Kingdom',       'Europe',           NOW(), NOW()),
(5, 'Germany',              'Europe',           NOW(), NOW()),
(6, 'Malaysia',             'Asia',             NOW(), NOW()),
(7, 'Thailand',             'Asia',             NOW(), NOW());

ALTER TABLE travel_destinations AUTO_INCREMENT = 8;

-- -----------------------------------------------------
-- 2) USERS & AUTH
-- -----------------------------------------------------

DELETE FROM users;

-- NOTE: password_hash are placeholder strings – replace with real bcrypt hashes when needed.
INSERT INTO users
(id, full_name, email, mobile, password_hash, address, city_id,
 cnic, cnic_expiry, dob, nationality, gender, status, role,
 created_at, updated_at)
VALUES
(1, 'Admin User', 'admin@example.com', '03001234567',
 '$2b$10$adminhashadminhashadminhashadminhashxx', -- dummy bcrypt-like string
 'Shaheen HQ, Karachi', 1,
 '42101-1111111-1', '2030-12-31', '1990-01-01',
 'Pakistani', 'male', 'active', 'admin',
 NOW(), NOW()),

(2, 'Ali Khan', 'ali@example.com', '03009998888',
 '$2b$10$user1hashuser1hashuser1hashuser1hashxx',
 'Gulshan-e-Iqbal, Karachi', 1,
 '42101-2222222-2', '2031-05-25', '1996-04-15',
 'Pakistani', 'male', 'active', 'customer',
 NOW(), NOW()),

(3, 'Danish Ahmed', 'danish@example.com', '03005553333',
 '$2b$10$user2hashuser2hashuser2hashuser2hashxx',
 'DHA, Lahore', 2,
 '42101-3333333-3', '2032-08-10', '1998-09-22',
 'Pakistani', 'male', 'active', 'customer',
 NOW(), NOW());

ALTER TABLE users AUTO_INCREMENT = 4;

-- Optional: clear OTPs
DELETE FROM otp_codes;
ALTER TABLE otp_codes AUTO_INCREMENT = 1;

-- -----------------------------------------------------
-- 3) MOTOR INSURANCE
-- -----------------------------------------------------

-- CHILD FIRST
DELETE FROM motor_vehicle_images;
ALTER TABLE motor_vehicle_images AUTO_INCREMENT = 1;

DELETE FROM motor_proposals;
ALTER TABLE motor_proposals AUTO_INCREMENT = 1;

-- Motor proposals (3 demo rows)
INSERT INTO motor_proposals
(id, user_id,
 name, address, city_id, cnic, cnic_expiry, dob, nationality, gender,
 product_type, registration_number, applied_for,
 engine_number, chassis_number,
 make_id, submake_id, model_year, colour,
 tracker_company_id, accessories_value,
 sum_insured, premium,
 status, created_at, updated_at)
VALUES
(1, 2,
 'Ali Khan', 'Gulshan-e-Iqbal, Karachi', 1,
 '42101-2222222-2', '2031-05-25', '1996-04-15', 'Pakistani', 'male',
 'private', 'ABC-123', 0,
 'ENG123456', 'CHS123456',
 1, 1, 2020, 'White',
 1, 50000.00,
 2500000.00, 44000.00,
 'submitted', NOW(), NOW()),

(2, 2,
 'Ali Khan', 'Gulshan-e-Iqbal, Karachi', 1,
 '42101-2222222-2', '2031-05-25', '1996-04-15', 'Pakistani', 'male',
 'private', 'BXY-789', 0,
 'ENG987654', 'CHS987654',
 2, 3, 2018, 'Black',
 2, 0.00,
 900000.00, 12000.00,
 'paid', NOW(), NOW()),

(3, 3,
 'Danish Ahmed', 'DHA, Lahore', 2,
 '42101-3333333-3', '2032-08-10', '1998-09-22', 'Pakistani', 'male',
 'commercial', 'LHR-555', 1,
 'ENG555555', 'CHS555555',
 3, 6, 2022, 'Silver',
 3, 75000.00,
 3200000.00, 52000.00,
 'submitted', NOW(), NOW());

-- Motor vehicle images for proposal 1 & 2
INSERT INTO motor_vehicle_images
(proposal_id, image_type, file_path, created_at)
VALUES
(1, 'front_side', 'uploads/motor/1_front.jpg',    NOW()),
(1, 'back_side',  'uploads/motor/1_back.jpg',     NOW()),
(1, 'dashboard',  'uploads/motor/1_dashboard.jpg',NOW()),
(2, 'front_side', 'uploads/motor/2_front.jpg',    NOW()),
(2, 'engine_bay', 'uploads/motor/2_engine.jpg',   NOW());

-- -----------------------------------------------------
-- 4) TRAVEL INSURANCE
-- -----------------------------------------------------

DELETE FROM travel_destinations_selected;
ALTER TABLE travel_destinations_selected AUTO_INCREMENT = 1;

DELETE FROM travel_proposals;
ALTER TABLE travel_proposals AUTO_INCREMENT = 1;

-- Travel proposals
INSERT INTO travel_proposals
(id, user_id,
 package_type, product_plan, coverage_type,
 start_date, end_date, tenure_days,
 sum_insured, add_ons_selected,
 first_name, last_name, address, city_id,
 cnic, passport_number, mobile, email, dob,
 is_student, university_name,
 parent_name, parent_address, parent_cnic, parent_cnic_issue_date, parent_relation,
 beneficiary_name, beneficiary_address, beneficiary_cnic, beneficiary_cnic_issue_date, beneficiary_relation,
 base_premium, add_ons_premium, final_premium,
 status, created_at, updated_at)
VALUES
-- 1) Normal individual Worldwide trip (Ali)
(1, 2,
 'Worldwide', 'WW-Standard', 'individual',
 '2025-02-10', '2025-03-05', 23,
 50000.00, 1,
 'Ali', 'Khan', 'Gulshan-e-Iqbal, Karachi', 1,
 '42101-2222222-2', 'AB1234567', '03009998888', 'ali@example.com', '1996-04-15',
 0, NULL,
 NULL, NULL, NULL, NULL, NULL,
 'Danish Khan', 'North Nazimabad, Karachi', '42101-5555555-5', '2011-05-01', 'Brother',
 7000.00, 1200.00, 8200.00,
 'submitted', NOW(), NOW()),

-- 2) Schengen trip, paid (Danish)
(2, 3,
 'Schengen', 'SCH-Plan-A', 'individual',
 '2025-01-20', '2025-01-30', 10,
 35000.00, 0,
 'Danish', 'Ahmed', 'DHA, Lahore', 2,
 '42101-3333333-3', 'CD7654321', '03005553333', 'danish@example.com', '1998-09-22',
 0, NULL,
 NULL, NULL, NULL, NULL, NULL,
 'Ali Khan', 'Gulshan-e-Iqbal, Karachi', '42101-2222222-2', '2010-06-10', 'Friend',
 4500.00, 500.00, 5000.00,
 'paid', NOW(), NOW()),

-- 3) Student travel worldwide (Ali as student)
(3, 2,
 'Student Travel', 'STU-Plan-1', 'individual',
 '2025-04-01', '2025-07-01', 91,
 100000.00, 1,
 'Ali', 'Khan', 'Gulshan-e-Iqbal, Karachi', 1,
 '42101-2222222-2', 'AB9999999', '03009998888', 'ali@example.com', '2000-01-10',
 1, 'XYZ International University',
 'Muhammad Khan', 'North Nazimabad, Karachi', '42101-4444444-4', '2010-01-01', 'Father',
 'Danish Ahmed', 'DHA, Lahore', '42101-3333333-3', '2012-03-15', 'Brother',
 12000.00, 3000.00, 15000.00,
 'submitted', NOW(), NOW());

-- Selected destinations for those proposals
INSERT INTO travel_destinations_selected
(proposal_id, destination_id, created_at)
VALUES
-- Proposal 1 (Ali - Worldwide) UAE + UK
(1, 1, NOW()),
(1, 4, NOW()),
-- Proposal 2 (Danish - Schengen) UK + Germany
(2, 4, NOW()),
(2, 5, NOW()),
-- Proposal 3 (Ali - Student) Turkey + Malaysia
(3, 3, NOW()),
(3, 6, NOW());

-- -----------------------------------------------------
-- 5) PAYMENTS
-- -----------------------------------------------------

DELETE FROM payments;
ALTER TABLE payments AUTO_INCREMENT = 1;

INSERT INTO payments
(user_id, application_type, application_id,
 amount, status, gateway, order_id, gateway_txn_id,
 raw_response, created_at, updated_at)
VALUES
-- Motor proposal 1 (Ali) - pending
(2, 'MOTOR', 1,
 44000.00, 'PENDING', 'PayFast', 'ORD-MTR-1001', NULL,
 JSON_OBJECT('message', 'Awaiting payment'), NOW(), NOW()),

-- Motor proposal 2 (Ali) - success
(2, 'MOTOR', 2,
 12000.00, 'SUCCESS', 'PayFast', 'ORD-MTR-1002', 'PF-MTR-123456',
 JSON_OBJECT('message', 'Payment captured'), NOW(), NOW()),

-- Travel proposal 1 (Ali) - failed
(2, 'TRAVEL', 1,
 8200.00, 'FAILED', 'PayFast', 'ORD-TRV-2001', NULL,
 JSON_OBJECT('error', 'Card declined'), NOW(), NOW()),

-- Travel proposal 2 (Danish) - success
(3, 'TRAVEL', 2,
 5000.00, 'SUCCESS', 'PayFast', 'ORD-TRV-2002', 'PF-TRV-789012',
 JSON_OBJECT('message', 'Payment captured'), NOW(), NOW()),

-- Travel proposal 3 (Ali) - pending
(2, 'TRAVEL', 3,
 15000.00, 'PENDING', 'PayFast', 'ORD-TRV-2003', NULL,
 JSON_OBJECT('message', 'Awaiting payment'), NOW(), NOW());

-- -----------------------------------------------------
-- 6) NOTIFICATIONS / FAQ / SUPPORT
-- -----------------------------------------------------

DELETE FROM notifications;
ALTER TABLE notifications AUTO_INCREMENT = 1;

INSERT INTO notifications
(user_id, title, body, type, is_read, sent_at, created_at)
VALUES
(2, 'Welcome to Shaheen Insurance',
 'Your account has been created successfully.', 'system', 0, NOW(), NOW()),
(2, 'Motor Proposal Submitted',
 'Your motor proposal ABC-123 has been submitted.', 'motor', 0, NOW(), NOW()),
(3, 'Travel Policy Issued',
 'Your Schengen travel policy has been issued.', 'travel', 1, NOW(), NOW());

DELETE FROM faqs;
ALTER TABLE faqs AUTO_INCREMENT = 1;

INSERT INTO faqs (category, question, answer, is_active, created_at, updated_at)
VALUES
('Motor',
 'What documents are required for motor insurance?',
 'You typically need your CNIC, vehicle registration, and inspection images.', 1, NOW(), NOW()),
('Travel',
 'Does travel insurance cover COVID-19?',
 'Coverage depends on the selected plan and destination. Please review policy wording.', 1, NOW(), NOW());

DELETE FROM support_requests;
ALTER TABLE support_requests AUTO_INCREMENT = 1;

INSERT INTO support_requests
(user_id, name, email, phone, message, status, created_at, updated_at)
VALUES
(2, 'Ali Khan', 'ali@example.com', '03009998888',
 'I want to change my vehicle color on the policy.', 'open', NOW(), NOW()),
(NULL, 'Random Visitor', 'visitor@example.com', '03001230000',
 'Need info about student travel plan.', 'in_progress', NOW(), NOW());

-- -----------------------------------------------------
-- 7) POLICY / CLAIM CACHE
-- -----------------------------------------------------

DELETE FROM policies_cache;
ALTER TABLE policies_cache AUTO_INCREMENT = 1;

INSERT INTO policies_cache
(user_id, policy_no, product, expiry_date, status, pdf_url,
 last_synced_at, created_at)
VALUES
(2, 'MTR-8888', 'Motor Comprehensive', '2026-05-20', 'Active',
 'https://example.com/policies/mtr-8888.pdf', NOW(), NOW()),
(2, 'TRV-1111', 'Travel Worldwide',    '2025-03-05', 'Expired',
 'https://example.com/policies/trv-1111.pdf', NOW(), NOW()),
(3, 'TRV-2222', 'Travel Schengen',     '2025-01-30', 'Active',
 'https://example.com/policies/trv-2222.pdf', NOW(), NOW());

DELETE FROM claims_cache;
ALTER TABLE claims_cache AUTO_INCREMENT = 1;

INSERT INTO claims_cache
(user_id, claim_no, status, incident_date, last_synced_at, created_at)
VALUES
(2, 'CLM-111-01', 'Approved', '2024-12-10', NOW(), NOW()),
(2, 'CLM-111-02', 'Pending',  '2025-01-05', NOW(), NOW()),
(3, 'CLM-222-01', 'Rejected', '2025-02-11', NOW(), NOW());

SET FOREIGN_KEY_CHECKS = 1;
