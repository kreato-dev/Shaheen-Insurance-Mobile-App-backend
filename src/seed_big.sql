SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =========================
-- 1) LOOKUPS
-- =========================

DELETE FROM vehicle_submakes;
DELETE FROM vehicle_makes;
DELETE FROM tracker_companies;
DELETE FROM travel_destinations;
DELETE FROM cities;

INSERT INTO cities (id, name, created_at, updated_at) VALUES
(1,'Karachi',NOW(),NOW()),
(2,'Lahore',NOW(),NOW()),
(3,'Islamabad',NOW(),NOW()),
(4,'Rawalpindi',NOW(),NOW()),
(5,'Peshawar',NOW(),NOW()),
(6,'Quetta',NOW(),NOW()),
(7,'Faisalabad',NOW(),NOW()),
(8,'Multan',NOW(),NOW()),
(9,'Hyderabad',NOW(),NOW()),
(10,'Sialkot',NOW(),NOW());
ALTER TABLE cities AUTO_INCREMENT = 11;

INSERT INTO vehicle_makes (id, name, created_at, updated_at) VALUES
(1,'Toyota',NOW(),NOW()),
(2,'Honda',NOW(),NOW()),
(3,'Suzuki',NOW(),NOW()),
(4,'Kia',NOW(),NOW()),
(5,'Hyundai',NOW(),NOW()),
(6,'Changan',NOW(),NOW());
ALTER TABLE vehicle_makes AUTO_INCREMENT = 7;

INSERT INTO vehicle_submakes (id, make_id, name, created_at, updated_at) VALUES
-- Toyota
(1,1,'Corolla',NOW(),NOW()),
(2,1,'Yaris',NOW(),NOW()),
(3,1,'Fortuner',NOW(),NOW()),
-- Honda
(4,2,'Civic',NOW(),NOW()),
(5,2,'City',NOW(),NOW()),
(6,2,'BR-V',NOW(),NOW()),
-- Suzuki
(7,3,'Alto',NOW(),NOW()),
(8,3,'Cultus',NOW(),NOW()),
(9,3,'Swift',NOW(),NOW()),
-- Kia
(10,4,'Sportage',NOW(),NOW()),
(11,4,'Picanto',NOW(),NOW()),
(12,4,'Stonic',NOW(),NOW()),
-- Hyundai
(13,5,'Tucson',NOW(),NOW()),
(14,5,'Elantra',NOW(),NOW()),
(15,5,'Sonata',NOW(),NOW()),
-- Changan
(16,6,'Alsvin',NOW(),NOW()),
(17,6,'Oshan X7',NOW(),NOW()),
(18,6,'Karvaan',NOW(),NOW());
ALTER TABLE vehicle_submakes AUTO_INCREMENT = 19;

INSERT INTO tracker_companies (id, name, created_at, updated_at) VALUES
(1,'TPL Trakker',NOW(),NOW()),
(2,'Falcon-i',NOW(),NOW()),
(3,'C-Track',NOW(),NOW()),
(4,'Tracking World',NOW(),NOW()),
(5,'Shaheen Tracker Partner A',NOW(),NOW()),
(6,'Shaheen Tracker Partner B',NOW(),NOW());
ALTER TABLE tracker_companies AUTO_INCREMENT = 7;

INSERT INTO travel_destinations (id, name, region, created_at, updated_at) VALUES
(1,'United Arab Emirates','Middle East',NOW(),NOW()),
(2,'Saudi Arabia','Middle East',NOW(),NOW()),
(3,'Qatar','Middle East',NOW(),NOW()),
(4,'Turkey','Europe/Asia',NOW(),NOW()),
(5,'United Kingdom','Europe',NOW(),NOW()),
(6,'Germany','Europe',NOW(),NOW()),
(7,'France','Europe',NOW(),NOW()),
(8,'Italy','Europe',NOW(),NOW()),
(9,'Spain','Europe',NOW(),NOW()),
(10,'United States','North America',NOW(),NOW()),
(11,'Canada','North America',NOW(),NOW()),
(12,'Malaysia','Asia',NOW(),NOW()),
(13,'Thailand','Asia',NOW(),NOW()),
(14,'China','Asia',NOW(),NOW()),
(15,'Pakistan','Domestic',NOW(),NOW());
ALTER TABLE travel_destinations AUTO_INCREMENT = 16;

-- =========================
-- 2) USERS
-- =========================

-- child tables first
DELETE FROM otp_codes;
DELETE FROM notifications;
DELETE FROM support_requests;
DELETE FROM policies_cache;
DELETE FROM claims_cache;
DELETE FROM payments;
DELETE FROM motor_vehicle_images;
DELETE FROM motor_proposals;
DELETE FROM travel_destinations_selected;
DELETE FROM travel_proposals;

DELETE FROM users;

-- NOTE: password_hash is dummy placeholder; replace with bcrypt if needed.
INSERT INTO users
(id, full_name, email, mobile, password_hash, address, city_id, cnic, cnic_expiry, dob, nationality, gender, status, role, created_at, updated_at)
VALUES
(1,'Admin User','admin@example.com','03001234567','$2b$10$hGLoCzWNJPl3q1/HnLLeaO.ryenHGQk93db6G9tjUr8ImMYbkXxJ2','HQ Karachi',1,'42101-1111111-1','2030-12-31','1990-01-01','Pakistani','male','active','admin',NOW(),NOW()),
(2,'Ali Khan','ali@example.com','03009998888','$2b$10$userhashxxxxxxxxxxxxxxxxxxxxxxxxxxxx','Gulshan Karachi',1,'42101-2222222-2','2031-05-25','1996-04-15','Pakistani','male','active','customer',NOW(),NOW()),
(3,'Danish Ahmed','danish@example.com','03005553333','$2b$10$userhashxxxxxxxxxxxxxxxxxxxxxxxxxxxx','DHA Lahore',2,'42101-3333333-3','2032-08-10','1998-09-22','Pakistani','male','active','customer',NOW(),NOW()),
(4,'Ayesha Noor','ayesha@example.com','03112223344','$2b$10$userhashxxxxxxxxxxxxxxxxxxxxxxxxxxxx','F-11 Islamabad',3,'37405-1234567-1','2031-12-31','1997-11-02','Pakistani','female','active','customer',NOW(),NOW()),
(5,'Hassan Raza','hassan@example.com','03221112233','$2b$10$userhashxxxxxxxxxxxxxxxxxxxxxxxxxxxx','Gulberg Lahore',2,'35202-7654321-9','2030-10-10','1995-06-18','Pakistani','male','active','customer',NOW(),NOW()),
(6,'Sara Iqbal','sara@example.com','03334445566','$2b$10$userhashxxxxxxxxxxxxxxxxxxxxxxxxxxxx','Cantt Rawalpindi',4,'37406-1122334-5','2033-01-01','1999-02-14','Pakistani','female','active','customer',NOW(),NOW()),
(7,'Usman Tariq','usman@example.com','03445556677','$2b$10$userhashxxxxxxxxxxxxxxxxxxxxxxxxxxxx','Peshawar Saddar',5,'17301-1112233-4','2032-09-09','1994-09-09','Pakistani','male','active','customer',NOW(),NOW()),
(8,'Maryam Shah','maryam@example.com','03017778899','$2b$10$userhashxxxxxxxxxxxxxxxxxxxxxxxxxxxx','Quetta',6,'51201-9988776-5','2031-03-03','2000-12-20','Pakistani','female','active','customer',NOW(),NOW()),
(9,'Bilal Khan','bilal@example.com','03118889900','$2b$10$userhashxxxxxxxxxxxxxxxxxxxxxxxxxxxx','Faisalabad',7,'34101-1231231-7','2032-07-07','1993-03-12','Pakistani','male','active','customer',NOW(),NOW()),
(10,'Zain Ali','zain@example.com','03226667788','$2b$10$userhashxxxxxxxxxxxxxxxxxxxxxxxxxxxx','Multan',8,'36102-5556667-8','2030-08-08','1992-05-25','Pakistani','male','active','customer',NOW(),NOW()),
(11,'Noor Fatima','noor@example.com','03339990011','$2b$10$userhashxxxxxxxxxxxxxxxxxxxxxxxxxxxx','Hyderabad',9,'41201-1113335-2','2033-04-04','1998-08-08','Pakistani','female','active','customer',NOW(),NOW()),
(12,'Hamza Saeed','hamza@example.com','03440001122','$2b$10$userhashxxxxxxxxxxxxxxxxxxxxxxxxxxxx','Sialkot',10,'33104-7778889-1','2031-06-06','1997-01-19','Pakistani','male','active','customer',NOW(),NOW());
ALTER TABLE users AUTO_INCREMENT = 13;

-- =========================
-- 3) MOTOR PROPOSALS (15)
-- =========================

INSERT INTO motor_proposals
(id, user_id, name, address, city_id, cnic, cnic_expiry, dob, nationality, gender,
 product_type, registration_number, applied_for, engine_number, chassis_number,
 make_id, submake_id, model_year, colour, tracker_company_id, accessories_value,
 sum_insured, premium, status, created_at, updated_at)
VALUES
(1,2,'Ali Khan','Gulshan Karachi',1,'42101-2222222-2','2031-05-25','1996-04-15','Pakistani','male','private','KHI-101',0,'ENG101','CHS101',1,1,2020,'White',1,25000.00,2500000.00,44000.00,'submitted',NOW(),NOW()),
(2,3,'Danish Ahmed','DHA Lahore',2,'42101-3333333-3','2032-08-10','1998-09-22','Pakistani','male','private','LHR-202',0,'ENG202','CHS202',2,4,2019,'Black',2,0.00,1800000.00,32000.00,'paid',NOW(),NOW()),
(3,4,'Ayesha Noor','F-11 Islamabad',3,'37405-1234567-1','2031-12-31','1997-11-02','Pakistani','female','private','ISB-303',0,'ENG303','CHS303',3,7,2021,'Silver',3,10000.00,1200000.00,26000.00,'submitted',NOW(),NOW()),
(4,5,'Hassan Raza','Gulberg Lahore',2,'35202-7654321-9','2030-10-10','1995-06-18','Pakistani','male','commercial','LHR-404',1,'ENG404','CHS404',4,10,2022,'Gray',4,75000.00,3200000.00,52000.00,'submitted',NOW(),NOW()),
(5,6,'Sara Iqbal','Cantt Rawalpindi',4,'37406-1122334-5','2033-01-01','1999-02-14','Pakistani','female','private','RWP-505',0,'ENG505','CHS505',5,13,2020,'Blue',NULL,0.00,2800000.00,48000.00,'draft',NOW(),NOW()),
(6,7,'Usman Tariq','Peshawar Saddar',5,'17301-1112233-4','2032-09-09','1994-09-09','Pakistani','male','commercial','PSH-606',1,'ENG606','CHS606',6,16,2023,'White',5,50000.00,2400000.00,41000.00,'submitted',NOW(),NOW()),
(7,8,'Maryam Shah','Quetta',6,'51201-9988776-5','2031-03-03','2000-12-20','Pakistani','female','private','QTA-707',0,'ENG707','CHS707',3,8,2018,'Red',1,0.00,900000.00,15000.00,'paid',NOW(),NOW()),
(8,9,'Bilal Khan','Faisalabad',7,'34101-1231231-7','2032-07-07','1993-03-12','Pakistani','male','private','FSD-808',0,'ENG808','CHS808',2,5,2021,'Black',2,20000.00,2100000.00,36000.00,'submitted',NOW(),NOW()),
(9,10,'Zain Ali','Multan',8,'36102-5556667-8','2030-08-08','1992-05-25','Pakistani','male','private','MUX-909',0,'ENG909','CHS909',1,2,2019,'Silver',3,0.00,1400000.00,27000.00,'cancelled',NOW(),NOW()),
(10,11,'Noor Fatima','Hyderabad',9,'41201-1113335-2','2033-04-04','1998-08-08','Pakistani','female','private','HYD-010',0,'ENG010','CHS010',5,14,2022,'White',6,10000.00,3300000.00,56000.00,'submitted',NOW(),NOW()),
(11,12,'Hamza Saeed','Sialkot',10,'33104-7778889-1','2031-06-06','1997-01-19','Pakistani','male','commercial','SKT-111',1,'ENG111','CHS111',6,17,2021,'Gray',4,25000.00,2600000.00,45000.00,'submitted',NOW(),NOW()),
(12,2,'Ali Khan','Gulshan Karachi',1,'42101-2222222-2','2031-05-25','1996-04-15','Pakistani','male','private','KHI-112',0,'ENG112','CHS112',4,12,2020,'Blue',1,0.00,1700000.00,30000.00,'submitted',NOW(),NOW()),
(13,3,'Danish Ahmed','DHA Lahore',2,'42101-3333333-3','2032-08-10','1998-09-22','Pakistani','male','private','LHR-113',0,'ENG113','CHS113',5,15,2023,'Black',2,80000.00,4200000.00,69000.00,'submitted',NOW(),NOW()),
(14,4,'Ayesha Noor','F-11 Islamabad',3,'37405-1234567-1','2031-12-31','1997-11-02','Pakistani','female','private','ISB-114',0,'ENG114','CHS114',1,3,2022,'White',3,15000.00,3800000.00,62000.00,'paid',NOW(),NOW()),
(15,5,'Hassan Raza','Gulberg Lahore',2,'35202-7654321-9','2030-10-10','1995-06-18','Pakistani','male','commercial','LHR-115',1,'ENG115','CHS115',3,9,2017,'Red',NULL,0.00,800000.00,12000.00,'submitted',NOW(),NOW());

ALTER TABLE motor_proposals AUTO_INCREMENT = 16;

-- Motor vehicle images (2 per proposal = 30 rows)
INSERT INTO motor_vehicle_images (proposal_id, image_type, file_path, created_at) VALUES
(1,'front_side','uploads/motor/1_front.jpg',NOW()), (1,'back_side','uploads/motor/1_back.jpg',NOW()),
(2,'front_side','uploads/motor/2_front.jpg',NOW()), (2,'dashboard','uploads/motor/2_dashboard.jpg',NOW()),
(3,'front_side','uploads/motor/3_front.jpg',NOW()), (3,'engine_bay','uploads/motor/3_engine.jpg',NOW()),
(4,'front_side','uploads/motor/4_front.jpg',NOW()), (4,'boot','uploads/motor/4_boot.jpg',NOW()),
(5,'front_side','uploads/motor/5_front.jpg',NOW()), (5,'engine_number','uploads/motor/5_engno.jpg',NOW()),
(6,'front_side','uploads/motor/6_front.jpg',NOW()), (6,'registration_front','uploads/motor/6_regf.jpg',NOW()),
(7,'front_side','uploads/motor/7_front.jpg',NOW()), (7,'registration_back','uploads/motor/7_regb.jpg',NOW()),
(8,'front_side','uploads/motor/8_front.jpg',NOW()), (8,'left_side','uploads/motor/8_left.jpg',NOW()),
(9,'front_side','uploads/motor/9_front.jpg',NOW()), (9,'right_side','uploads/motor/9_right.jpg',NOW()),
(10,'front_side','uploads/motor/10_front.jpg',NOW()), (10,'back_side','uploads/motor/10_back.jpg',NOW()),
(11,'front_side','uploads/motor/11_front.jpg',NOW()), (11,'dashboard','uploads/motor/11_dashboard.jpg',NOW()),
(12,'front_side','uploads/motor/12_front.jpg',NOW()), (12,'engine_bay','uploads/motor/12_engine.jpg',NOW()),
(13,'front_side','uploads/motor/13_front.jpg',NOW()), (13,'boot','uploads/motor/13_boot.jpg',NOW()),
(14,'front_side','uploads/motor/14_front.jpg',NOW()), (14,'engine_number','uploads/motor/14_engno.jpg',NOW()),
(15,'front_side','uploads/motor/15_front.jpg',NOW()), (15,'registration_front','uploads/motor/15_regf.jpg',NOW());

-- =========================
-- 4) TRAVEL PROPOSALS (12) + DESTINATIONS_SELECTED (24)
-- =========================

INSERT INTO travel_proposals
(id, user_id,
 package_type, product_plan, coverage_type, start_date, end_date, tenure_days, sum_insured, add_ons_selected,
 first_name, last_name, address, city_id, cnic, passport_number, mobile, email, dob, is_student, university_name,
 parent_name, parent_address, parent_cnic, parent_cnic_issue_date, parent_relation,
 beneficiary_name, beneficiary_address, beneficiary_cnic, beneficiary_cnic_issue_date, beneficiary_relation,
 base_premium, add_ons_premium, final_premium,
 status, created_at, updated_at)
VALUES
(1,2,'Worldwide','WW-Standard','individual','2025-02-10','2025-03-05',23,50000.00,1,'Ali','Khan','Gulshan Karachi',1,'42101-2222222-2','AB1234567','03009998888','ali@example.com','1996-04-15',0,NULL,
 NULL,NULL,NULL,NULL,NULL,
 'Danish Ahmed','DHA Lahore','42101-3333333-3','2012-03-15','Brother',
 7000.00,1200.00,8200.00,'submitted',NOW(),NOW()),

(2,3,'Schengen','SCH-A','individual','2025-01-20','2025-01-30',10,35000.00,0,'Danish','Ahmed','DHA Lahore',2,'42101-3333333-3','CD7654321','03005553333','danish@example.com','1998-09-22',0,NULL,
 NULL,NULL,NULL,NULL,NULL,
 'Ali Khan','Gulshan Karachi','42101-2222222-2','2010-06-10','Friend',
 4500.00,500.00,5000.00,'paid',NOW(),NOW()),

(3,4,'Worldwide','WW-Premium','family','2025-03-01','2025-03-14',13,80000.00,1,'Ayesha','Noor','F-11 Islamabad',3,'37405-1234567-1','EF1112223','03112223344','ayesha@example.com','1997-11-02',0,NULL,
 NULL,NULL,NULL,NULL,NULL,
 'Sara Iqbal','Cantt Rawalpindi','37406-1122334-5','2011-05-01','Sister',
 9000.00,1500.00,10500.00,'submitted',NOW(),NOW()),

(4,5,'Domestic','DOM-1','individual','2025-04-05','2025-04-12',7,20000.00,0,'Hassan','Raza','Gulberg Lahore',2,'35202-7654321-9',NULL,'03221112233','hassan@example.com','1995-06-18',0,NULL,
 NULL,NULL,NULL,NULL,NULL,
 'Ali Khan','Gulshan Karachi','42101-2222222-2','2010-06-10','Friend',
 1800.00,0.00,1800.00,'submitted',NOW(),NOW()),

(5,6,'Student Travel','STU-Plan-1','individual','2025-05-01','2025-08-01',92,100000.00,1,'Sara','Iqbal','Cantt Rawalpindi',4,'37406-1122334-5','ST009988','03334445566','sara@example.com','2000-01-10',1,'NUST',
 'Muhammad Iqbal','Cantt Rawalpindi','37406-0000000-0','2010-01-01','Father',
 'Ayesha Noor','F-11 Islamabad','37405-1234567-1','2012-03-15','Sister',
 12000.00,3000.00,15000.00,'submitted',NOW(),NOW()),

(6,7,'Middle East','ME-1','individual','2025-02-01','2025-02-09',8,30000.00,1,'Usman','Tariq','Peshawar Saddar',5,'17301-1112233-4','GH555666','03445556677','usman@example.com','1994-09-09',0,NULL,
 NULL,NULL,NULL,NULL,NULL,
 'Maryam Shah','Quetta','51201-9988776-5','2011-05-01','Wife',
 2600.00,700.00,3300.00,'paid',NOW(),NOW()),

(7,8,'Worldwide','WW-Standard','individual','2025-06-01','2025-06-20',19,45000.00,0,'Maryam','Shah','Quetta',6,'51201-9988776-5','IJ111999','03017778899','maryam@example.com','2000-12-20',0,NULL,
 NULL,NULL,NULL,NULL,NULL,
 'Usman Tariq','Peshawar Saddar','17301-1112233-4','2011-05-01','Husband',
 6500.00,0.00,6500.00,'submitted',NOW(),NOW()),

(8,9,'Schengen','SCH-B','individual','2025-07-10','2025-07-25',15,60000.00,1,'Bilal','Khan','Faisalabad',7,'34101-1231231-7','KL222333','03118889900','bilal@example.com','1993-03-12',0,NULL,
 NULL,NULL,NULL,NULL,NULL,
 'Noor Fatima','Hyderabad','41201-1113335-2','2012-03-15','Sister',
 8000.00,1800.00,9800.00,'submitted',NOW(),NOW()),

(9,10,'Asia','AS-1','individual','2025-08-01','2025-08-12',11,40000.00,0,'Zain','Ali','Multan',8,'36102-5556667-8','MN777888','03226667788','zain@example.com','1992-05-25',0,NULL,
 NULL,NULL,NULL,NULL,NULL,
 'Hamza Saeed','Sialkot','33104-7778889-1','2010-06-10','Friend',
 3200.00,0.00,3200.00,'cancelled',NOW(),NOW()),

(10,11,'Domestic','DOM-2','family','2025-01-05','2025-01-15',10,25000.00,1,'Noor','Fatima','Hyderabad',9,'41201-1113335-2',NULL,'03339990011','noor@example.com','1998-08-08',0,NULL,
 NULL,NULL,NULL,NULL,NULL,
 'Bilal Khan','Faisalabad','34101-1231231-7','2012-03-15','Brother',
 2100.00,400.00,2500.00,'paid',NOW(),NOW()),

(11,12,'Worldwide','WW-Premium','individual','2025-09-01','2025-09-18',17,90000.00,1,'Hamza','Saeed','Sialkot',10,'33104-7778889-1','OP111222','03440001122','hamza@example.com','1997-01-19',0,NULL,
 NULL,NULL,NULL,NULL,NULL,
 'Ali Khan','Gulshan Karachi','42101-2222222-2','2010-06-10','Friend',
 9500.00,2500.00,12000.00,'submitted',NOW(),NOW()),

(12,2,'Middle East','ME-2','individual','2025-10-01','2025-10-08',7,35000.00,1,'Ali','Khan','Gulshan Karachi',1,'42101-2222222-2','AB1239999','03009998888','ali@example.com','1996-04-15',0,NULL,
 NULL,NULL,NULL,NULL,NULL,
 'Danish Ahmed','DHA Lahore','42101-3333333-3','2012-03-15','Brother',
 2400.00,600.00,3000.00,'submitted',NOW(),NOW());

ALTER TABLE travel_proposals AUTO_INCREMENT = 13;

-- 2 destinations per proposal = 24 rows
INSERT INTO travel_destinations_selected (proposal_id, destination_id, created_at) VALUES
(1,1,NOW()), (1,5,NOW()),
(2,5,NOW()), (2,6,NOW()),
(3,10,NOW()), (3,11,NOW()),
(4,15,NOW()), (4,12,NOW()),
(5,5,NOW()), (5,6,NOW()),
(6,1,NOW()), (6,2,NOW()),
(7,4,NOW()), (7,12,NOW()),
(8,6,NOW()), (8,7,NOW()),
(9,12,NOW()), (9,13,NOW()),
(10,15,NOW()), (10,1,NOW()),
(11,10,NOW()), (11,5,NOW()),
(12,1,NOW()), (12,3,NOW());

-- =========================
-- 5) PAYMENTS (20)
-- =========================

INSERT INTO payments
(user_id, application_type, application_id, amount, status, gateway, order_id, gateway_txn_id, raw_response, created_at, updated_at)
VALUES
(2,'MOTOR',1,44000.00,'PENDING','PayFast','ORD-MTR-1001',NULL,JSON_OBJECT('msg','Awaiting payment'),NOW(),NOW()),
(3,'MOTOR',2,32000.00,'SUCCESS','PayFast','ORD-MTR-1002','PF-MTR-1002',JSON_OBJECT('msg','Captured'),NOW(),NOW()),
(4,'MOTOR',3,26000.00,'FAILED','PayFast','ORD-MTR-1003',NULL,JSON_OBJECT('error','Declined'),NOW(),NOW()),
(5,'MOTOR',4,52000.00,'PENDING','PayFast','ORD-MTR-1004',NULL,JSON_OBJECT('msg','Awaiting'),NOW(),NOW()),
(6,'MOTOR',5,48000.00,'SUCCESS','PayFast','ORD-MTR-1005','PF-MTR-1005',JSON_OBJECT('msg','Captured'),NOW(),NOW()),
(7,'MOTOR',6,41000.00,'PENDING','PayFast','ORD-MTR-1006',NULL,JSON_OBJECT('msg','Awaiting'),NOW(),NOW()),
(8,'MOTOR',7,15000.00,'SUCCESS','PayFast','ORD-MTR-1007','PF-MTR-1007',JSON_OBJECT('msg','Captured'),NOW(),NOW()),
(9,'MOTOR',8,36000.00,'FAILED','PayFast','ORD-MTR-1008',NULL,JSON_OBJECT('error','Timeout'),NOW(),NOW()),
(11,'MOTOR',10,56000.00,'PENDING','PayFast','ORD-MTR-1010',NULL,JSON_OBJECT('msg','Awaiting'),NOW(),NOW()),
(4,'MOTOR',14,62000.00,'SUCCESS','PayFast','ORD-MTR-1014','PF-MTR-1014',JSON_OBJECT('msg','Captured'),NOW(),NOW()),

(2,'TRAVEL',1,8200.00,'FAILED','PayFast','ORD-TRV-2001',NULL,JSON_OBJECT('error','Declined'),NOW(),NOW()),
(3,'TRAVEL',2,5000.00,'SUCCESS','PayFast','ORD-TRV-2002','PF-TRV-2002',JSON_OBJECT('msg','Captured'),NOW(),NOW()),
(4,'TRAVEL',3,10500.00,'PENDING','PayFast','ORD-TRV-2003',NULL,JSON_OBJECT('msg','Awaiting'),NOW(),NOW()),
(5,'TRAVEL',4,1800.00,'SUCCESS','PayFast','ORD-TRV-2004','PF-TRV-2004',JSON_OBJECT('msg','Captured'),NOW(),NOW()),
(6,'TRAVEL',5,15000.00,'PENDING','PayFast','ORD-TRV-2005',NULL,JSON_OBJECT('msg','Awaiting'),NOW(),NOW()),
(7,'TRAVEL',6,3300.00,'SUCCESS','PayFast','ORD-TRV-2006','PF-TRV-2006',JSON_OBJECT('msg','Captured'),NOW(),NOW()),
(8,'TRAVEL',7,6500.00,'FAILED','PayFast','ORD-TRV-2007',NULL,JSON_OBJECT('error','Declined'),NOW(),NOW()),
(9,'TRAVEL',8,9800.00,'PENDING','PayFast','ORD-TRV-2008',NULL,JSON_OBJECT('msg','Awaiting'),NOW(),NOW()),
(11,'TRAVEL',10,2500.00,'SUCCESS','PayFast','ORD-TRV-2010','PF-TRV-2010',JSON_OBJECT('msg','Captured'),NOW(),NOW()),
(12,'TRAVEL',11,12000.00,'PENDING','PayFast','ORD-TRV-2011',NULL,JSON_OBJECT('msg','Awaiting'),NOW(),NOW());

-- =========================
-- 6) NOTIFICATIONS (12)
-- =========================

INSERT INTO notifications (user_id, title, body, type, is_read, sent_at, created_at) VALUES
(2,'Welcome','Your account is active.','system',0,NOW(),NOW()),
(3,'Payment Success','Your motor payment is successful.','payment',1,NOW(),NOW()),
(4,'Proposal Submitted','Motor proposal ISB-303 submitted.','motor',0,NOW(),NOW()),
(5,'Pending Payment','Please complete payment to proceed.','payment',0,NOW(),NOW()),
(6,'Travel Submitted','Travel proposal submitted successfully.','travel',0,NOW(),NOW()),
(7,'Motor Paid','Your motor proposal is now paid.','motor',1,NOW(),NOW()),
(8,'Travel Failed','Payment failed for travel proposal.','travel',0,NOW(),NOW()),
(9,'Profile Update','Your profile was updated.','profile',1,NOW(),NOW()),
(10,'Claim Update','Your claim is under review.','claim',0,NOW(),NOW()),
(11,'Policy Issued','Your policy has been issued.','policy',0,NOW(),NOW()),
(12,'Support Reply','Support team replied to your ticket.','support',0,NOW(),NOW()),
(2,'Reminder','Complete pending payment.','payment',0,NOW(),NOW());

-- =========================
-- 7) FAQS (10)
-- =========================

DELETE FROM faqs;
INSERT INTO faqs (category, question, answer, is_active, created_at, updated_at) VALUES
('Motor','What is comprehensive insurance?','It covers theft, accident, and damages based on policy terms.',1,NOW(),NOW()),
('Motor','Is tracker mandatory?','Depends on vehicle value and policy requirements.',1,NOW(),NOW()),
('Motor','What are required images?','Front/back/engine/chassis/registration images.',1,NOW(),NOW()),
('Travel','Does travel cover medical?','Yes, according to plan limits and conditions.',1,NOW(),NOW()),
('Travel','What is Schengen coverage?','Coverage for Schengen countries based on selected plan.',1,NOW(),NOW()),
('Travel','Student travel requirements?','Student details + parent info required.',1,NOW(),NOW()),
('Payments','Which payment gateway?','PayFast is used for payment processing.',1,NOW(),NOW()),
('Account','How to reset password?','Use OTP via forgot password flow.',1,NOW(),NOW()),
('Claims','How to file a claim?','Submit claim request through the app.',1,NOW(),NOW()),
('Support','How to contact support?','Use in-app support request form.',1,NOW(),NOW());

-- =========================
-- 8) SUPPORT REQUESTS (8)
-- =========================

INSERT INTO support_requests (user_id, name, email, phone, message, status, created_at, updated_at) VALUES
(2,'Ali Khan','ali@example.com','03009998888','Need help updating vehicle details.','open',NOW(),NOW()),
(3,'Danish Ahmed','danish@example.com','03005553333','Payment receipt needed.','in_progress',NOW(),NOW()),
(4,'Ayesha Noor','ayesha@example.com','03112223344','Travel plan clarification required.','open',NOW(),NOW()),
(5,'Hassan Raza','hassan@example.com','03221112233','How to add destinations?','closed',NOW(),NOW()),
(NULL,'Visitor','visitor1@example.com','03001230000','General inquiry about insurance.','open',NOW(),NOW()),
(NULL,'Visitor','visitor2@example.com','03001230001','Need agent call back.','in_progress',NOW(),NOW()),
(6,'Sara Iqbal','sara@example.com','03334445566','Student travel parent validation issue.','open',NOW(),NOW()),
(7,'Usman Tariq','usman@example.com','03445556677','Motor proposal stuck on submitted.','open',NOW(),NOW());

-- =========================
-- 9) POLICIES / CLAIMS CACHE (10 each)
-- =========================

DELETE FROM policies_cache;
INSERT INTO policies_cache (user_id, policy_no, product, expiry_date, status, pdf_url, last_synced_at, created_at) VALUES
(2,'MTR-0001','Motor Comprehensive','2026-05-20','Active','https://example.com/policies/mtr-0001.pdf',NOW(),NOW()),
(3,'MTR-0002','Motor Comprehensive','2026-01-10','Active','https://example.com/policies/mtr-0002.pdf',NOW(),NOW()),
(4,'TRV-0003','Travel Worldwide','2025-03-05','Expired','https://example.com/policies/trv-0003.pdf',NOW(),NOW()),
(5,'TRV-0004','Travel Domestic','2025-04-12','Active','https://example.com/policies/trv-0004.pdf',NOW(),NOW()),
(6,'TRV-0005','Student Travel','2025-08-01','Active','https://example.com/policies/trv-0005.pdf',NOW(),NOW()),
(7,'MTR-0006','Motor Commercial','2026-09-09','Active','https://example.com/policies/mtr-0006.pdf',NOW(),NOW()),
(8,'TRV-0007','Travel Worldwide','2025-06-20','Active','https://example.com/policies/trv-0007.pdf',NOW(),NOW()),
(9,'TRV-0008','Travel Schengen','2025-07-25','Active','https://example.com/policies/trv-0008.pdf',NOW(),NOW()),
(10,'MTR-0009','Motor Private','2026-08-08','Active','https://example.com/policies/mtr-0009.pdf',NOW(),NOW()),
(11,'TRV-0010','Travel Domestic','2025-01-15','Expired','https://example.com/policies/trv-0010.pdf',NOW(),NOW());

DELETE FROM claims_cache;
INSERT INTO claims_cache (user_id, claim_no, status, incident_date, last_synced_at, created_at) VALUES
(2,'CLM-1001','Approved','2024-12-10',NOW(),NOW()),
(3,'CLM-1002','Pending','2025-01-05',NOW(),NOW()),
(4,'CLM-1003','Rejected','2025-02-11',NOW(),NOW()),
(5,'CLM-1004','Pending','2025-03-02',NOW(),NOW()),
(6,'CLM-1005','Approved','2025-04-12',NOW(),NOW()),
(7,'CLM-1006','Pending','2025-05-20',NOW(),NOW()),
(8,'CLM-1007','Rejected','2025-06-01',NOW(),NOW()),
(9,'CLM-1008','Approved','2025-07-15',NOW(),NOW()),
(10,'CLM-1009','Pending','2025-08-05',NOW(),NOW()),
(11,'CLM-1010','Approved','2025-09-09',NOW(),NOW());

SET FOREIGN_KEY_CHECKS = 1;
