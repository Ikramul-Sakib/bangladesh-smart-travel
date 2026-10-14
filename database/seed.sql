-- ============================================================================
-- Bangladesh Smart Travel Planner & Tour Agent Management System
-- Demonstration Seed Data (All 13 Required Bangladesh Destinations)
-- ============================================================================

USE bd_smart_travel;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE reviews;
TRUNCATE TABLE booking_status_histories;
TRUNCATE TABLE bookings;
TRUNCATE TABLE travel_plan_items;
TRUNCATE TABLE travel_plans;
TRUNCATE TABLE tour_package_items;
TRUNCATE TABLE tour_packages;
TRUNCATE TABLE additional_expenses;
TRUNCATE TABLE food_costs;
TRUNCATE TABLE hotel_room_types;
TRUNCATE TABLE hotels;
TRUNCATE TABLE transport_options;
TRUNCATE TABLE agent_availabilities;
TRUNCATE TABLE agent_destinations;
TRUNCATE TABLE tourist_attractions;
TRUNCATE TABLE destinations;
TRUNCATE TABLE agent_profiles;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- 1. USERS (1 Admin, 3 Tour Agents, 2 Tourists)
-- Run `node database/setDemoPasswords.js` after seeding to set known passwords
-- ============================================================================
INSERT INTO users (id, full_name, email, phone, password_hash, role, status) VALUES
(1, 'System Administrator', 'admin@bdsmarttravel.com', '01711000001', '$2b$12$eImiTXuWVxfM37uY4JANjQ==', 'admin', 'active'),
(2, 'Rafiqul Islam (Bengal Eco Tours)', 'rafiq@bengalecotours.com', '01711000002', '$2b$12$eImiTXuWVxfM37uY4JANjQ==', 'agent', 'active'),
(3, 'Nusrat Jahan (Hill & Sea Expeditions)', 'nusrat@hillsea.com', '01811000003', '$2b$12$eImiTXuWVxfM37uY4JANjQ==', 'agent', 'active'),
(4, 'Kamrul Hasan (Heritage & Mangrove Guides)', 'kamrul@sundarbanheritage.com', '01911000004', '$2b$12$eImiTXuWVxfM37uY4JANjQ==', 'agent', 'active'),
(5, 'Tanvir Ahmed', 'tanvir@example.com', '01611000005', '$2b$12$eImiTXuWVxfM37uY4JANjQ==', 'tourist', 'active'),
(6, 'Farhana Rahman', 'farhana@example.com', '01511000006', '$2b$12$eImiTXuWVxfM37uY4JANjQ==', 'tourist', 'active');

-- ============================================================================
-- 2. AGENT PROFILES
-- ============================================================================
INSERT INTO agent_profiles
(id, user_id, agency_name, bio, license_number, base_service_fee_bdt, max_group_capacity, tour_types, services_offered, languages_spoken, is_verified, rating_avg, review_count)
VALUES
(1, 2, 'Bengal Eco Tours & Travels (Demo)', 'Demonstration agency specializing in coastal and island tours across Cox''s Bazar, Saint Martin''s, and Kuakata.', 'DEMO-BTB-101', 2000.00, 16, 'Family, Friends, Group', 'Tour Guide, Local Transport, Hotel Check-in, Ship Ticket Assistance', 'Bengali, English', 1, 4.80, 12),
(2, 3, 'Hill & Tea Valley Expeditions (Demo)', 'Demonstration agency covering Chittagong Hill Tracts (Sajek, Bandarban, Rangamati) and Sylhet/Srimangal tea estates.', 'DEMO-BTB-202', 2500.00, 12, 'Adventure, Friends, Solo, Group', 'Chander Gari Booking, Trekking Guide, Resort Permit Assistance', 'Bengali, English, Chakma', 1, 4.90, 18),
(3, 4, 'Sundarbans & Heritage Guides (Demo)', 'Demonstration agency focused on Sundarbans forest permits, Bagerhat mosques, Paharpur Vihara, Rajshahi, and Dhaka heritage.', 'DEMO-BTB-303', 1800.00, 20, 'Family, Heritage, Group, Solo', 'Forest Permit, Armed Guard Coordination, Archaeological Guide, Launch Charter', 'Bengali, English', 1, 4.70, 9);

-- ============================================================================
-- 3. ALL 13 REQUIRED BANGLADESH DESTINATIONS
-- ============================================================================
INSERT INTO destinations
(id, name, slug, division, landscape_type, short_description, detailed_description, best_time_to_visit, travel_notes, image_url, is_featured, is_active)
VALUES
(1, 'Cox''s Bazar', 'coxs-bazar', 'Chattogram', 'Beach',
 'World''s longest unbroken natural sandy sea beach stretching 120 km along the Bay of Bengal.',
 'Cox''s Bazar is Bangladesh''s premier coastal destination featuring Laboni, Sugandha, and Inani beaches, Marine Drive, Himchari waterfalls, and fresh Bay of Bengal seafood.',
 'November to March', 'Demonstration Data: Confirm beach safety flags before swimming.', '/images/default-destination.jpg', 1, 1),

(2, 'Saint Martin''s Island', 'saint-martins-island', 'Chattogram', 'Island',
 'Bangladesh''s only coral island, famous for crystal-clear blue water, coconut groves, and Chera Dwip.',
 'Located in the northeastern Bay of Bengal, Saint Martin''s Island (Narikel Jinjira) offers coral reefs, serene sunsets, and eco-friendly beach cottages.',
 'November to February', 'Demonstration Data: Ship services depend on sea weather and government environmental permits.', '/images/default-destination.jpg', 1, 1),

(3, 'Sylhet', 'sylhet', 'Sylhet', 'Tea Garden & Haor',
 'Land of rolling green tea gardens, crystal-clear Jaflong rivers, Ratargul Swamp Forest, and Bisnakandi.',
 'Sylhet sits in picturesque northeastern Bangladesh, surrounded by the Khasia and Jaintia hills, waterfalls, sub-tropical forests, and lush river valleys.',
 'June to February', 'Demonstration Data: Monsoon brings full water flow to Bisnakandi and Ratargul; winter offers pleasant trekking.', '/images/default-destination.jpg', 1, 1),

(4, 'Sajek Valley', 'sajek-valley', 'Chattogram', 'Hill Tract',
 'Queen of Hills in Rangamati district, famous for sea-of-clouds sunrises at Konglak Para.',
 'Perched 1,800 feet above sea level in Baghaichhari Upazila, Sajek Valley offers panoramic cloud views, Lushai heritage, and scenic Chander Gari rides from Khagrachhari.',
 'September to March', 'Demonstration Data: Army escort convoy timings apply at Baghaihat check-post.', '/images/default-destination.jpg', 1, 1),

(5, 'Bandarban', 'bandarban', 'Chattogram', 'Hill Tract',
 'Adventure capital of Bangladesh featuring Nilgiri, Nilachal, Boga Lake, Nafakhum, and Sangu River.',
 'Bandarban offers the highest peaks in Bangladesh, indigenous cultural diversity, Golden Temple (Buddha Dhatu Jadi), and misty mountain resorts.',
 'October to March', 'Demonstration Data: Carry national ID cards for hill check-post registration.', '/images/default-destination.jpg', 1, 1),

(6, 'Rangamati', 'rangamati', 'Chattogram', 'Hill Tract',
 'Lake city of Bangladesh centered around the scenic Kaptai Lake, Hanging Bridge, and Shuvolong Waterfalls.',
 'Rangamati blends emerald hills with the vast Kaptai Lake, offering wooden boat cruises, Chakma Rajbari visits, and handloom textile markets.',
 'October to March', 'Demonstration Data: Shuvolong waterfall flow is highest between July and November.', '/images/default-destination.jpg', 0, 1),

(7, 'Sundarbans', 'sundarbans', 'Khulna', 'Mangrove Forest',
 'UNESCO World Heritage site and the world''s largest tidal halophytic mangrove forest, home to the Royal Bengal Tiger.',
 'Accessed via Khulna or Mongla, the Sundarbans features Karamjal, Kotka, Kochikhali, Hiron Point, and Dublar Char through guided riverboat expeditions.',
 'November to February', 'Demonstration Data: Forest Department entry permits and licensed guides are mandatory.', '/images/default-destination.jpg', 1, 1),

(8, 'Kuakata', 'kuakata', 'Barishal', 'Beach',
 'Daughter of the Sea—rare panoramic beach where visitors can watch both sunrise and sunset over the Bay of Bengal.',
 'Kuakata in Patuakhali offers an 18 km sandy beach, Fatrar Char mangrove forest, Gangamati Reserved Forest, and Rakhine cultural markets.',
 'November to March', 'Demonstration Data: Accessible directly from Dhaka via Padma Bridge by road or Barishal river launch.', '/images/default-destination.jpg', 0, 1),

(9, 'Srimangal', 'srimangal', 'Sylhet', 'Tea Garden & Haor',
 'Tea Capital of Bangladesh featuring Lawachara National Park, Madhabpur Lake, Baikka Beel, and Seven-Layer Tea.',
 'Srimangal in Moulvibazar district is renowned for terraced tea estates, Hoolock gibbons in Lawachara rainforest, and tranquil cycling trails.',
 'October to March', 'Demonstration Data: Early morning is best for wildlife spotting in Lawachara National Park.', '/images/default-destination.jpg', 0, 1),

(10, 'Dhaka', 'dhaka', 'Dhaka', 'Urban',
 'Historic capital city showcasing Lalbagh Fort, Ahsan Manzil, Sadarghat River Port, Parliament House, and Old Dhaka cuisine.',
 'Dhaka combines 400 years of Mughal and British architectural heritage with vibrant river life along the Buriganga and world-famous Old Dhaka Biriyani.',
 'Year-round (Best: November to February)', 'Demonstration Data: Old Dhaka heritage sites are best explored on Friday or Saturday mornings.', '/images/default-destination.jpg', 0, 1),

(11, 'Rajshahi', 'rajshahi', 'Rajshahi', 'Heritage & Cultural',
 'Silk City on the banks of the Padma River, near Puthia Temple Complex and Varendra Research Museum.',
 'Rajshahi is celebrated for its clean boulevards, Padma garden sunsets, Puthia terracotta temples, mango orchards, and silk weaving.',
 'May to July (Mango Season) & November to February', 'Demonstration Data: Combine Rajshahi city with a half-day excursion to Puthia.', '/images/default-destination.jpg', 0, 1),

(12, 'Paharpur', 'paharpur', 'Rajshahi', 'Heritage & Cultural',
 'UNESCO World Heritage site of Somapura Mahavihara in Naogaon, one of the largest Buddhist monasteries south of the Himalayas.',
 'Built in the 8th century by Dharmapala of the Pala Dynasty, Paharpur features a monumental central stupa, terracotta plaques, and an archaeological museum.',
 'October to March', 'Demonstration Data: Easily reachable via Jaipurhat or Bogura rail and bus links.', '/images/default-destination.jpg', 0, 1),

(13, 'Bagerhat', 'bagerhat', 'Khulna', 'Heritage & Cultural',
 'UNESCO World Heritage Mosque City founded by Khan Jahan Ali in the 15th century, featuring the Sixty Dome Mosque.',
 'Bagerhat showcases medieval Sultanate architecture including Shat Gombuj Masjid (Sixty Dome Mosque), Shrine of Khan Jahan Ali, and Nine Dome Mosque.',
 'November to March', 'Demonstration Data: Often paired with a Khulna or Sundarbans Karamjal day trip.', '/images/default-destination.jpg', 0, 1);

-- ============================================================================
-- 4. TOURIST ATTRACTIONS (Sample Attractions Across All 13 Destinations)
-- ============================================================================
INSERT INTO tourist_attractions (destination_id, name, category, description, entrance_fee_bdt, estimated_duration_hours, is_verified, is_active) VALUES
(1, 'Himchari National Park & Waterfall', 'Nature', 'Hilltop viewpoint and coastal waterfall along Marine Drive.', 50.00, 2.0, 1, 1),
(1, 'Inani Coral Stone Beach', 'Beach', 'Golden beach famous for exposed coral boulders at low tide.', 0.00, 2.5, 1, 1),
(1, 'Radiant Fish World Aquarium', 'Attraction', 'Indoor marine aquarium in Cox''s Bazar town.', 300.00, 2.0, 0, 1),
(2, 'Chera Dwip Coral Islet', 'Island', 'Southernmost uninhabited coral extension of Saint Martin''s.', 100.00, 3.0, 0, 1),
(3, 'Ratargul Freshwater Swamp Forest', 'Forest', 'Submerged forest explored by country boat.', 150.00, 2.5, 0, 1),
(3, 'Jaflong & Dawki River View', 'Nature', 'Stone collection point and clear mountain river at the border.', 50.00, 3.0, 1, 1),
(4, 'Konglak Para Highest Peak', 'Hill Viewpoint', 'Highest indigenous village in Sajek for sunrise & sunset views.', 50.00, 2.0, 1, 1),
(4, 'Alutila Mysterious Cave & Risang Waterfall', 'Adventure', 'Torch-lit natural cave and cascading waterfall in Khagrachhari.', 80.00, 2.5, 0, 1),
(5, 'Nilgiri & Nilachal Hill Viewpoints', 'Hill Viewpoint', 'Cloud-kissed mountain resorts overlooking the Sangu valley.', 160.00, 3.5, 0, 1),
(5, 'Buddha Dhatu Jadi (Golden Temple)', 'Heritage', 'Theravada Buddhist temple atop Pulpara hill.', 50.00, 1.5, 1, 1),
(6, 'Kaptai Lake Hanging Bridge (Jhulonto Shetu)', 'Sightseeing', 'Iconic suspension bridge over Kaptai Lake.', 40.00, 1.5, 1, 1),
(7, 'Karamjal Wildlife Breeding & Eco Park', 'Wildlife', 'Mangrove boardwalk, spotted deer, and crocodile conservation center.', 100.00, 2.5, 1, 1),
(7, 'Kotka & Jamtola Watchtower', 'Wildlife', 'Deep Sundarbans tiger and deer observation sanctuary.', 400.00, 5.0, 0, 1),
(8, 'Lebur Char & Gangamati Mangrove Forest', 'Nature', 'Coastal mangrove estuaries at opposite ends of Kuakata beach.', 50.00, 2.5, 0, 1),
(9, 'Lawachara National Park', 'Rainforest', 'Tropical semi-evergreen forest home to Hoolock gibbons.', 115.00, 3.0, 1, 1),
(9, 'Madhabpur Lake & Tea Estates', 'Nature', 'Blue lotus lake surrounded by rolling tea hills.', 50.00, 2.0, 0, 1),
(10, 'Lalbagh Fort & Ahsan Manzil Pink Palace', 'Heritage', 'Mughal fort and Nawab palace museum in Old Dhaka.', 120.00, 3.5, 1, 1),
(11, 'Puthia Rajbari & Terracotta Temples', 'Heritage', 'Historic Hindu temple complex and palace in Rajshahi.', 60.00, 3.0, 1, 1),
(12, 'Somapura Mahavihara & Archaeological Museum', 'UNESCO Heritage', '8th-century Buddhist monastery ruins and museum.', 100.00, 3.5, 1, 1),
(13, 'Sixty Dome Mosque (Shat Gombuj Masjid) & Museum', 'UNESCO Heritage', '15th-century Sultanate mosque and Bagerhat museum.', 80.00, 2.5, 1, 1);

-- ============================================================================
-- 5. TRANSPORT OPTIONS (Bus, Train, Launch, Private Car from Dhaka to All 13)
-- ============================================================================
INSERT INTO transport_options
(transport_type, departure_location, destination_id, operator_name, comfort_tier, pricing_model, vehicle_capacity, one_way_fare_bdt, return_fare_bdt, duration_hours, schedule_info, additional_fees_bdt, is_verified, is_active)
VALUES
-- 1. Cox's Bazar
('bus', 'Dhaka', 1, 'Hanif / Shyamoli Non-AC (Demo)', 'budget', 'per_person', 1, 1100.00, 2200.00, 9.5, '08:00 AM, 10:00 PM', 0, 0, 1),
('train', 'Dhaka', 1, 'Cox''s Bazar Express - Snigdha AC (Demo)', 'standard', 'per_person', 1, 1325.00, 2650.00, 8.5, '10:30 PM Daily', 0, 1, 1),
('bus', 'Dhaka', 1, 'Green Line AC Sleeper / Business (Demo)', 'premium', 'per_person', 1, 2200.00, 4400.00, 9.0, '09:30 PM, 11:00 PM', 0, 0, 1),
('private_car', 'Dhaka', 1, 'Private Noah Microbus Charter (Demo)', 'standard', 'per_vehicle', 7, 16000.00, 30000.00, 8.5, 'Flexible Pickup', 1500.00, 0, 1),
-- 2. Saint Martin's Island (Bus to Teknaf/Cox's + Cruise Ship)
('bus', 'Dhaka', 2, 'Saintmartin Paribahan Non-AC + Ship Econ (Demo)', 'budget', 'per_person', 1, 2100.00, 4000.00, 12.0, '07:00 PM Departure', 100.00, 0, 1),
('launch', 'Dhaka', 2, 'AC Bus + Keari Sindbad / Karnafuly Ship (Demo)', 'standard', 'per_person', 1, 3200.00, 6200.00, 11.5, '08:00 PM Bus + 09:00 AM Ship', 150.00, 0, 1),
('launch', 'Dhaka', 2, 'Sleeper Bus + MV Bay One Open Deck VIP (Demo)', 'premium', 'per_person', 1, 4800.00, 9200.00, 11.0, 'VIP Lounge & Deck', 200.00, 0, 1),
-- 3. Sylhet
('train', 'Dhaka', 3, 'Parabat / Kalni Express - Shovan Chair (Demo)', 'budget', 'per_person', 1, 380.00, 760.00, 6.5, '06:20 AM, 02:55 PM', 0, 1, 1),
('bus', 'Dhaka', 3, 'Ena / London Express AC Economy (Demo)', 'standard', 'per_person', 1, 1200.00, 2400.00, 5.5, 'Hourly Departures', 0, 0, 1),
('bus', 'Dhaka', 3, 'Green Line / London Express Business AC (Demo)', 'premium', 'per_person', 1, 1500.00, 3000.00, 5.5, 'Every 2 Hours', 0, 0, 1),
-- 4. Sajek Valley (Via Khagrachhari)
('bus', 'Dhaka', 4, 'Shanti / Shyamoli Non-AC to Khagrachhari (Demo)', 'budget', 'per_person', 1, 750.00, 1500.00, 7.5, '10:45 PM Night Coach', 0, 0, 1),
('bus', 'Dhaka', 4, 'Saintmartin Hyundai / Relax AC to Khagrachhari (Demo)', 'standard', 'per_person', 1, 1400.00, 2800.00, 7.0, '10:30 PM Night Coach', 0, 0, 1),
('private_car', 'Dhaka', 4, 'Private Hiace Charter to Sajek (Demo)', 'premium', 'per_vehicle', 8, 18000.00, 34000.00, 7.5, 'Door-to-Door Charter', 1000.00, 0, 1),
-- 5. Bandarban
('bus', 'Dhaka', 5, 'Shyamoli / Hanif Non-AC to Bandarban (Demo)', 'budget', 'per_person', 1, 850.00, 1700.00, 8.0, '10:30 PM Night Coach', 0, 0, 1),
('bus', 'Dhaka', 5, 'Soudia / Saintmartin AC Business (Demo)', 'standard', 'per_person', 1, 1600.00, 3200.00, 7.5, '11:00 PM Night Coach', 0, 0, 1),
('bus', 'Dhaka', 5, 'Shohagh Elite Sleeper Suite (Demo)', 'premium', 'per_person', 1, 2100.00, 4200.00, 7.5, '11:15 PM Night Coach', 0, 0, 1),
-- 6. Rangamati
('bus', 'Dhaka', 6, 'Dolphin / Hanif Non-AC to Rangamati (Demo)', 'budget', 'per_person', 1, 850.00, 1700.00, 8.0, '10:00 PM Night Coach', 0, 0, 1),
('bus', 'Dhaka', 6, 'Shyamoli / Robi Express AC (Demo)', 'standard', 'per_person', 1, 1500.00, 3000.00, 7.5, '10:45 PM Night Coach', 0, 0, 1),
-- 7. Sundarbans (Via Khulna / Mongla)
('bus', 'Dhaka', 7, 'Tungipara / Sohag Non-AC via Padma Bridge (Demo)', 'budget', 'per_person', 1, 650.00, 1300.00, 4.5, 'Hourly from Sayedabad', 0, 0, 1),
('train', 'Dhaka', 7, 'Sundarban / Jahanabad Express AC Snigdha (Demo)', 'standard', 'per_person', 1, 950.00, 1900.00, 4.0, '06:00 AM, 08:00 PM', 0, 1, 1),
('bus', 'Dhaka', 7, 'Green Line / Sohag Elite AC Business (Demo)', 'premium', 'per_person', 1, 1350.00, 2700.00, 4.0, 'Multiple Daily', 0, 0, 1),
-- 8. Kuakata
('bus', 'Dhaka', 8, 'Sakura / Sugandha Non-AC via Padma Bridge (Demo)', 'budget', 'per_person', 1, 750.00, 1500.00, 5.5, '08:00 AM, 11:00 PM', 0, 0, 1),
('bus', 'Dhaka', 8, 'Sakura / Green Line AC Business (Demo)', 'standard', 'per_person', 1, 1300.00, 2600.00, 5.0, '08:30 AM, 11:30 PM', 0, 0, 1),
-- 9. Srimangal
('train', 'Dhaka', 9, 'Upaban / Jayantika Express Shovan Chair (Demo)', 'budget', 'per_person', 1, 320.00, 640.00, 4.5, '06:20 AM, 11:15 AM, 10:00 PM', 0, 1, 1),
('train', 'Dhaka', 9, 'Parabat Express AC Snigdha (Demo)', 'standard', 'per_person', 1, 610.00, 1220.00, 4.5, '06:20 AM Daily', 0, 1, 1),
('bus', 'Dhaka', 9, 'Hanif / Ena AC Coach (Demo)', 'premium', 'per_person', 1, 900.00, 1800.00, 4.5, 'Every 2 Hours', 0, 0, 1),
-- 10. Dhaka
('bus', 'Dhaka', 10, 'Metro Rail & AC City Bus Pass (Demo)', 'budget', 'per_person', 1, 200.00, 400.00, 1.0, 'All Day City Transit', 0, 1, 1),
('private_car', 'Dhaka', 10, 'Full-Day AC Sedan Sightseeing Rental (Demo)', 'standard', 'per_vehicle', 4, 3500.00, 3500.00, 8.0, '10 Hours City Charter', 300.00, 0, 1),
-- 11. Rajshahi
('train', 'Dhaka', 11, 'Silk City / Padma Express Shovan Chair (Demo)', 'budget', 'per_person', 1, 405.00, 810.00, 5.5, '02:30 PM, 10:45 PM', 0, 1, 1),
('train', 'Dhaka', 11, 'Banalata Express Non-Stop AC Snigdha (Demo)', 'standard', 'per_person', 1, 875.00, 1750.00, 4.5, '01:30 PM Daily (Except Fri)', 0, 1, 1),
('bus', 'Dhaka', 11, 'Desh Travels / Grameen Travels AC Hyundai (Demo)', 'premium', 'per_person', 1, 1300.00, 2600.00, 5.5, 'Hourly Departures', 0, 0, 1),
-- 12. Paharpur (Via Jaipurhat / Santahar)
('train', 'Dhaka', 12, 'Nilsagar / Ekota Express Shovan Chair (Demo)', 'budget', 'per_person', 1, 465.00, 930.00, 6.0, '06:45 AM, 10:15 AM', 0, 1, 1),
('train', 'Dhaka', 12, 'Kurigram / Panchagarh Express AC Snigdha (Demo)', 'standard', 'per_person', 1, 890.00, 1780.00, 6.0, '08:00 PM, 11:30 PM', 0, 1, 1),
-- 13. Bagerhat
('bus', 'Dhaka', 13, 'Falguni / Sohag Non-AC via Padma Bridge (Demo)', 'budget', 'per_person', 1, 650.00, 1300.00, 4.0, 'Multiple Daily', 0, 0, 1),
('bus', 'Dhaka', 13, 'Dola / Tungipara Express AC Coach (Demo)', 'standard', 'per_person', 1, 1100.00, 2200.00, 3.5, 'Multiple Daily', 0, 0, 1);

-- ============================================================================
-- 6. HOTELS & ROOM TYPES (Budget, Standard & Premium Across Destinations)
-- ============================================================================
INSERT INTO hotels (id, destination_id, name, category, address, facilities, is_verified, is_active) VALUES
(1, 1, 'Hotel Coral Breeze Guest House (Demo)', 'budget', 'Kolatoli Block B, Cox''s Bazar', 'Wi-Fi, Non-AC Fan, Attached Bath', 0, 1),
(2, 1, 'Hotel Sea Crown Deluxe (Demo)', 'standard', 'Marin Drive Beach Front, Cox''s Bazar', 'Wi-Fi, AC, Complimentary Breakfast, Restaurant', 0, 1),
(3, 1, 'Sayeman / Royal Tulip Beach Resort (Demo)', 'premium', 'Kolatoli / Inani Marine Drive, Cox''s Bazar', 'Infinity Pool, Sea View Balcony, Buffet Breakfast, Spa', 0, 1),
(4, 2, 'Blue Marine Eco Cottage (Demo)', 'budget', 'West Beach, Saint Martin''s Island', 'Solar Power, Beach Access, Mosquito Net', 0, 1),
(5, 2, 'Coral View Beach Resort (Demo)', 'standard', 'East Beach, Saint Martin''s Island', 'Generator Backup, Sea View Veranda, BBQ Area', 0, 1),
(6, 3, 'Hotel Metro International (Demo)', 'budget', 'Zindabazar, Sylhet', 'Wi-Fi, Attached Bath, Lift', 0, 1),
(7, 3, 'Hotel Noorjahan Grand (Demo)', 'standard', 'Dargah Gate, Sylhet', 'AC, Pool, Buffet Breakfast, Wi-Fi', 0, 1),
(8, 3, 'Nazimgarh Garden Resort (Demo)', 'premium', 'Khadimnagar Tea Valley, Sylhet', 'Luxury Villa, Pool, Spa, Tea Estate View', 0, 1),
(9, 4, 'Megh Machang Wooden Cottage (Demo)', 'budget', 'Ruilui Para, Sajek Valley', 'Cloud View Veranda, Solar Power', 0, 1),
(10, 4, 'Sajek Resort / Runmoy Eco Resort (Demo)', 'standard', 'Ruilui Para Ridge, Sajek Valley', 'Panoramic Balcony, Generator, Restaurant', 0, 1),
(11, 5, 'Hill View Hotel Bandarban (Demo)', 'budget', 'Main Road, Bandarban Sadar', 'Wi-Fi, Hot Water, Tour Desk', 0, 1),
(12, 5, 'Sairu Hill Resort / Nilgiri Cottage (Demo)', 'premium', 'Chimbuk Road, Bandarban', 'Infinity Pool over Hills, Luxury AC Suite', 0, 1),
(13, 6, 'Hotel Nadisa International (Demo)', 'standard', 'Reserve Bazar, Rangamati', 'Lake View, AC, Boat Pier Access', 0, 1),
(14, 7, 'Tiger Garden / Eco Tourist Vessel Cabin (Demo)', 'standard', 'Khulna / Mongla River Port', 'Attached Bath Cabin, Generator, Guided Deck', 0, 1),
(15, 8, 'Hotel Kuakata Inn (Demo)', 'standard', 'Sea Beach Road, Kuakata', 'AC, Wi-Fi, 2-Min Walk to Beach', 0, 1),
(16, 9, 'Tea Heaven Resort Srimangal (Demo)', 'standard', 'Radhanagar Tea Garden Road, Srimangal', 'AC, Tea Garden View, Bicycle Rental', 0, 1),
(17, 10, 'Hotel 71 Dhaka (Demo)', 'standard', 'Bijoynagar, Dhaka', 'AC, Buffet Breakfast, High-Speed Wi-Fi', 0, 1),
(18, 11, 'Grand River View Hotel Rajshahi (Demo)', 'standard', 'Padma Embankment Road, Rajshahi', 'AC, River View, Restaurant', 0, 1),
(19, 12, 'Paharpur Archaeological Rest House (Demo)', 'budget', 'Badalgachhi, Naogaon', 'Clean Twin Rooms near Mahavihara Gate', 0, 1),
(20, 13, 'Hotel Castle / Bagerhat Parjatan Motel (Demo)', 'standard', 'Khulna-Bagerhat Highway', 'AC, Parking, Restaurant', 0, 1);

INSERT INTO hotel_room_types (hotel_id, room_type_name, price_per_night_bdt, max_guests_per_room, available_rooms_count, is_active) VALUES
(1, 'Economy Non-AC Double Room', 1400.00, 2, 12, 1),
(2, 'Deluxe AC Couple / Twin Room', 3200.00, 2, 15, 1),
(3, 'Ocean Front Luxury Suite', 7500.00, 2, 10, 1),
(4, 'Eco Bamboo Double Cottage', 1800.00, 2, 8, 1),
(5, 'Sea View Standard Family Room', 3500.00, 4, 10, 1),
(6, 'Budget Twin Room', 1500.00, 2, 12, 1),
(7, 'Deluxe AC Double Room', 3000.00, 2, 15, 1),
(8, 'Premier Tea Garden Villa', 6800.00, 2, 8, 1),
(9, 'Valley View Wooden Room', 2200.00, 3, 8, 1),
(10, 'Premium Cloud View Cottage', 4200.00, 4, 6, 1),
(11, 'Standard Double Room', 1800.00, 2, 10, 1),
(12, 'Hilltop Luxury Villa', 7000.00, 2, 6, 1),
(13, 'Lake View AC Double', 2400.00, 2, 10, 1),
(14, 'Twin Forest Cruise Cabin / Hotel Room', 3200.00, 2, 12, 1),
(15, 'Deluxe Beach Road AC Room', 2500.00, 2, 12, 1),
(16, 'Eco Garden AC Double', 2600.00, 2, 10, 1),
(17, 'Executive City AC Room', 3400.00, 2, 15, 1),
(18, 'Padma View Deluxe Room', 2800.00, 2, 12, 1),
(19, 'Standard Heritage Guest Room', 1400.00, 2, 8, 1),
(20, 'Standard AC Twin Room', 2200.00, 2, 10, 1);

-- ============================================================================
-- 7. FOOD COSTS (Budget, Standard & Premium Tiers for All 13 Destinations)
-- ============================================================================
INSERT INTO food_costs
(destination_id, tier, package_name, breakfast_cost_bdt, lunch_cost_bdt, dinner_cost_bdt, snacks_water_cost_bdt, is_verified)
VALUES
(1, 'budget', 'Local Poushee / Jhaubon Economy Meals', 90, 220, 240, 70, 0),
(1, 'standard', 'Standard Rupchanda & Coral Fish Platter Plan', 140, 350, 400, 110, 0),
(1, 'premium', 'Beachside Seafood BBQ & Resort Buffet Plan', 250, 650, 800, 150, 0),
(2, 'budget', 'Island Economy Rice & Fish Meal Plan', 100, 250, 280, 80, 0),
(2, 'standard', 'Coral Fish BBQ & Coconut Water Plan', 150, 380, 480, 120, 0),
(3, 'budget', 'Zindabazar Local Bhorta-Bhat Plan', 80, 200, 220, 60, 0),
(3, 'standard', 'Panshi / Palki Traditional Shatkora Beef & Duck Plan', 130, 320, 360, 90, 0),
(4, 'budget', 'Indigenous Bamboo Chicken & Jhum Rice Economy', 90, 230, 250, 70, 0),
(4, 'standard', 'Sajek Hill View Restaurant & BBQ Package', 140, 320, 380, 100, 0),
(5, 'budget', 'Bandarban Local Dining Plan', 85, 210, 230, 65, 0),
(5, 'standard', 'Hill Tract Bamboo Shoot & Chicken Meal Plan', 130, 300, 350, 90, 0),
(6, 'standard', 'Kaptai Lake Fresh Fish & Peda Ting Ting Dining', 120, 300, 320, 80, 0),
(7, 'standard', 'Sundarbans Launch Full-Board Meal Plan', 150, 380, 420, 100, 0),
(8, 'standard', 'Kuakata Fresh Crab & Sea Fish Meal Plan', 110, 280, 320, 80, 0),
(9, 'standard', 'Srimangal Seven-Layer Tea & Traditional Dining', 110, 280, 300, 90, 0),
(10, 'standard', 'Old Dhaka Kacchi Biriyani & Kebab Trail Plan', 120, 350, 380, 100, 0),
(11, 'standard', 'Rajshahi Kalai Ruti & Padma Hilsha Meal Plan', 100, 280, 300, 80, 0),
(12, 'standard', 'Naogaon / Bogura Doi & Traditional Meal Plan', 90, 240, 250, 70, 0),
(13, 'standard', 'Khulna Chui Jhal Beef & Golda Chingri Meal Plan', 110, 320, 340, 80, 0);

-- ============================================================================
-- 8. ADDITIONAL EXPENSES (Local Transport, Chander Gari, Boat Trips, Misc)
-- ============================================================================
INSERT INTO additional_expenses
(destination_id, expense_category, title, pricing_basis, cost_bdt, is_mandatory, is_verified, is_active)
VALUES
(1, 'local_transport', 'Marine Drive TomTom / CNG Sightseeing (Demo)', 'per_person_per_day', 200.00, 1, 0, 1),
(1, 'misc', 'Beach Lounger & Locker Rental (Demo)', 'per_person_per_day', 80.00, 0, 0, 1),
(2, 'boat_trip', 'Trawler Transfer to Chera Dwip Round-Trip (Demo)', 'per_person_flat', 250.00, 1, 0, 1),
(3, 'local_transport', 'CNG / Leguna Reserve for Jaflong & Ratargul (Demo)', 'per_group_per_day', 1800.00, 1, 0, 1),
(3, 'boat_trip', 'Ratargul Country Boat Hire (Demo)', 'per_group_flat', 850.00, 1, 0, 1),
(4, 'local_transport', 'Khagrachhari to Sajek Chander Gari 2-Day Reserve (Demo)', 'per_group_flat', 8200.00, 1, 0, 1),
(5, 'local_transport', 'Bandarban Nilgiri & Chimbuk Chander Gari Reserve (Demo)', 'per_group_per_day', 4500.00, 1, 0, 1),
(6, 'boat_trip', 'Kaptai Lake & Shuvolong Reserve Engine Boat (Demo)', 'per_group_per_day', 2200.00, 1, 0, 1),
(7, 'boat_trip', 'Sundarbans Trawler & Forest Guard Fee Share (Demo)', 'per_person_per_day', 900.00, 1, 0, 1),
(8, 'local_transport', 'Beach Motorbike / Auto Sightseeing to Lebur Char (Demo)', 'per_person_per_day', 250.00, 1, 0, 1),
(9, 'local_transport', 'Srimangal Tea Garden Jeep / CNG Sightseeing (Demo)', 'per_group_per_day', 1600.00, 1, 0, 1),
(10, 'local_transport', 'Old Dhaka Rickshaw & Metro Day Transit (Demo)', 'per_person_per_day', 220.00, 1, 0, 1),
(11, 'local_transport', 'Rajshahi to Puthia Auto Reserve (Demo)', 'per_group_per_day', 1200.00, 1, 0, 1),
(12, 'local_transport', 'Jaipurhat Station to Paharpur CNG Transfer (Demo)', 'per_group_flat', 800.00, 1, 0, 1),
(13, 'local_transport', 'Bagerhat Mosque Circuit Auto Reserve (Demo)', 'per_group_per_day', 1000.00, 1, 0, 1);

-- ============================================================================
-- 9. AGENT DESTINATIONS & AVAILABILITY WINDOWS
-- ============================================================================
INSERT INTO agent_destinations (agent_profile_id, destination_id, custom_service_fee_bdt) VALUES
(1, 1, 2000.00),
(1, 2, 2500.00),
(1, 8, 1800.00),
(2, 3, 2200.00),
(2, 4, 2800.00),
(2, 5, 2600.00),
(2, 6, 2200.00),
(2, 9, 2000.00),
(3, 7, 3000.00),
(3, 10, 1500.00),
(3, 11, 1800.00),
(3, 12, 1800.00),
(3, 13, 1800.00);

INSERT INTO agent_availabilities (agent_profile_id, start_date, end_date, status, notes) VALUES
(1, '2026-01-01', '2027-12-31', 'available', 'Year-round Coastal & Island Guiding Window'),
(2, '2026-01-01', '2027-12-31', 'available', 'Year-round Hill Tracts & Sylhet Guiding Window'),
(3, '2026-01-01', '2027-12-31', 'available', 'Year-round Sundarbans & Heritage Guiding Window');

-- ============================================================================
-- 10. SAMPLE TOUR PACKAGES
-- ============================================================================
INSERT INTO tour_packages
(agent_profile_id, destination_id, title, duration_days, nights, base_price_per_person_bdt, max_travelers, accommodation_category, transport_type, description, is_active)
VALUES
(1, 1, 'Cox''s Bazar 3 Days 2 Nights Family & Friends Saver (Demo)', 3, 2, 5200.00, 16, 'standard', 'bus', 'Includes round-trip AC/Non-AC bus, 2 nights Kolatoli hotel, daily meals, and Marine Drive sightseeing.', 1),
(2, 4, 'Sajek Valley Cloud Expedition 3 Days 2 Nights (Demo)', 3, 2, 6200.00, 12, 'standard', 'bus', 'Includes Dhaka-Khagrachhari bus, reserved Chander Gari, Ruilui Para cottage, and Alutila Cave.', 1),
(3, 7, 'Sundarbans Karamjal & Bagerhat UNESCO Heritage Tour (Demo)', 2, 1, 4800.00, 20, 'standard', 'bus', 'Includes Padma Bridge bus, Sixty Dome Mosque guided tour, and Karamjal riverboat excursion.', 1);