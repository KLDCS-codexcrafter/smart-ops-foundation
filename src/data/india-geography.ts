/**
 * india-geography.ts — Static reference data for Indian states, districts, cities
 * Used by geography masters for auto-seeding
 */

export interface IndianState {
  code: string;
  name: string;
  gstStateCode: string;
  unionTerritory: boolean;
}

export const indianStates: IndianState[] = [
  { code:'JK', name:'Jammu and Kashmir', gstStateCode:'01', unionTerritory:true },
  { code:'HP', name:'Himachal Pradesh', gstStateCode:'02', unionTerritory:false },
  { code:'PB', name:'Punjab', gstStateCode:'03', unionTerritory:false },
  { code:'CH', name:'Chandigarh', gstStateCode:'04', unionTerritory:true },
  { code:'UK', name:'Uttarakhand', gstStateCode:'05', unionTerritory:false },
  { code:'HR', name:'Haryana', gstStateCode:'06', unionTerritory:false },
  { code:'DL', name:'Delhi', gstStateCode:'07', unionTerritory:true },
  { code:'RJ', name:'Rajasthan', gstStateCode:'08', unionTerritory:false },
  { code:'UP', name:'Uttar Pradesh', gstStateCode:'09', unionTerritory:false },
  { code:'BR', name:'Bihar', gstStateCode:'10', unionTerritory:false },
  { code:'SK', name:'Sikkim', gstStateCode:'11', unionTerritory:false },
  { code:'AR', name:'Arunachal Pradesh', gstStateCode:'12', unionTerritory:false },
  { code:'NL', name:'Nagaland', gstStateCode:'13', unionTerritory:false },
  { code:'MN', name:'Manipur', gstStateCode:'14', unionTerritory:false },
  { code:'MZ', name:'Mizoram', gstStateCode:'15', unionTerritory:false },
  { code:'TR', name:'Tripura', gstStateCode:'16', unionTerritory:false },
  { code:'ML', name:'Meghalaya', gstStateCode:'17', unionTerritory:false },
  { code:'AS', name:'Assam', gstStateCode:'18', unionTerritory:false },
  { code:'WB', name:'West Bengal', gstStateCode:'19', unionTerritory:false },
  { code:'JH', name:'Jharkhand', gstStateCode:'20', unionTerritory:false },
  { code:'OD', name:'Odisha', gstStateCode:'21', unionTerritory:false },
  { code:'CG', name:'Chhattisgarh', gstStateCode:'22', unionTerritory:false },
  { code:'MP', name:'Madhya Pradesh', gstStateCode:'23', unionTerritory:false },
  { code:'GJ', name:'Gujarat', gstStateCode:'24', unionTerritory:false },
  { code:'DN', name:'Dadra and Nagar Haveli and Daman and Diu', gstStateCode:'26', unionTerritory:true },
  { code:'DD', name:'Daman and Diu', gstStateCode:'25', unionTerritory:true },
  { code:'MH', name:'Maharashtra', gstStateCode:'27', unionTerritory:false },
  { code:'KA', name:'Karnataka', gstStateCode:'29', unionTerritory:false },
  { code:'GA', name:'Goa', gstStateCode:'30', unionTerritory:false },
  { code:'LD', name:'Lakshadweep', gstStateCode:'31', unionTerritory:true },
  { code:'KL', name:'Kerala', gstStateCode:'32', unionTerritory:false },
  { code:'TN', name:'Tamil Nadu', gstStateCode:'33', unionTerritory:false },
  { code:'PY', name:'Puducherry', gstStateCode:'34', unionTerritory:true },
  { code:'AN', name:'Andaman and Nicobar Islands', gstStateCode:'35', unionTerritory:true },
  { code:'TS', name:'Telangana', gstStateCode:'36', unionTerritory:false },
  { code:'AP', name:'Andhra Pradesh', gstStateCode:'37', unionTerritory:false },
  { code:'LA', name:'Ladakh', gstStateCode:'38', unionTerritory:true },
];

export interface IndianDistrict {
  code: string;
  name: string;
  stateCode: string;
  headquarters: string;
}

export const indianDistricts: IndianDistrict[] = [
  // Maharashtra
  { code:'MH-MUM', name:'Mumbai City', stateCode:'MH', headquarters:'Mumbai' },
  { code:'MH-MUMS', name:'Mumbai Suburban', stateCode:'MH', headquarters:'Bandra' },
  { code:'MH-PUN', name:'Pune', stateCode:'MH', headquarters:'Pune' },
  { code:'MH-NAG', name:'Nagpur', stateCode:'MH', headquarters:'Nagpur' },
  { code:'MH-THN', name:'Thane', stateCode:'MH', headquarters:'Thane' },
  { code:'MH-NSK', name:'Nashik', stateCode:'MH', headquarters:'Nashik' },
  { code:'MH-AUR', name:'Aurangabad', stateCode:'MH', headquarters:'Aurangabad' },
  // Delhi
  { code:'DL-CEN', name:'Central Delhi', stateCode:'DL', headquarters:'Daryaganj' },
  { code:'DL-NOR', name:'North Delhi', stateCode:'DL', headquarters:'Civil Lines' },
  { code:'DL-SOU', name:'South Delhi', stateCode:'DL', headquarters:'Saket' },
  { code:'DL-EAS', name:'East Delhi', stateCode:'DL', headquarters:'Preet Vihar' },
  { code:'DL-WES', name:'West Delhi', stateCode:'DL', headquarters:'Rajouri Garden' },
  { code:'DL-NEW', name:'New Delhi', stateCode:'DL', headquarters:'Connaught Place' },
  // Karnataka
  { code:'KA-BLR-U', name:'Bengaluru Urban', stateCode:'KA', headquarters:'Bengaluru' },
  { code:'KA-BLR-R', name:'Bengaluru Rural', stateCode:'KA', headquarters:'Bengaluru' },
  { code:'KA-MYS', name:'Mysuru', stateCode:'KA', headquarters:'Mysuru' },
  { code:'KA-MNG', name:'Dakshina Kannada', stateCode:'KA', headquarters:'Mangaluru' },
  { code:'KA-HUB', name:'Dharwad', stateCode:'KA', headquarters:'Hubballi' },
  // Tamil Nadu
  { code:'TN-CHN', name:'Chennai', stateCode:'TN', headquarters:'Chennai' },
  { code:'TN-CBE', name:'Coimbatore', stateCode:'TN', headquarters:'Coimbatore' },
  { code:'TN-MDU', name:'Madurai', stateCode:'TN', headquarters:'Madurai' },
  { code:'TN-TRY', name:'Tiruchirappalli', stateCode:'TN', headquarters:'Tiruchirappalli' },
  // Gujarat
  { code:'GJ-AHM', name:'Ahmedabad', stateCode:'GJ', headquarters:'Ahmedabad' },
  { code:'GJ-SUR', name:'Surat', stateCode:'GJ', headquarters:'Surat' },
  { code:'GJ-VAD', name:'Vadodara', stateCode:'GJ', headquarters:'Vadodara' },
  { code:'GJ-RJK', name:'Rajkot', stateCode:'GJ', headquarters:'Rajkot' },
  { code:'GJ-KCH', name:'Kachchh', stateCode:'GJ', headquarters:'Bhuj' },
  // Uttar Pradesh
  { code:'UP-LKO', name:'Lucknow', stateCode:'UP', headquarters:'Lucknow' },
  { code:'UP-KNP', name:'Kanpur Nagar', stateCode:'UP', headquarters:'Kanpur' },
  { code:'UP-AGR', name:'Agra', stateCode:'UP', headquarters:'Agra' },
  { code:'UP-VNS', name:'Varanasi', stateCode:'UP', headquarters:'Varanasi' },
  { code:'UP-NOI', name:'Gautam Buddh Nagar', stateCode:'UP', headquarters:'Noida' },
  // West Bengal
  { code:'WB-KOL', name:'Kolkata', stateCode:'WB', headquarters:'Kolkata' },
  { code:'WB-HOW', name:'Howrah', stateCode:'WB', headquarters:'Howrah' },
  { code:'WB-N24', name:'North 24 Parganas', stateCode:'WB', headquarters:'Barasat' },
  // Rajasthan
  { code:'RJ-JPR', name:'Jaipur', stateCode:'RJ', headquarters:'Jaipur' },
  { code:'RJ-JDH', name:'Jodhpur', stateCode:'RJ', headquarters:'Jodhpur' },
  { code:'RJ-UDR', name:'Udaipur', stateCode:'RJ', headquarters:'Udaipur' },
  // Kerala
  { code:'KL-EKM', name:'Ernakulam', stateCode:'KL', headquarters:'Kochi' },
  { code:'KL-TVM', name:'Thiruvananthapuram', stateCode:'KL', headquarters:'Thiruvananthapuram' },
  { code:'KL-KZH', name:'Kozhikode', stateCode:'KL', headquarters:'Kozhikode' },
  // Telangana
  { code:'TS-HYD', name:'Hyderabad', stateCode:'TS', headquarters:'Hyderabad' },
  { code:'TS-RNG', name:'Rangareddy', stateCode:'TS', headquarters:'Hyderabad' },
  // Andhra Pradesh
  { code:'AP-VSK', name:'Visakhapatnam', stateCode:'AP', headquarters:'Visakhapatnam' },
  { code:'AP-VJW', name:'Vijayawada', stateCode:'AP', headquarters:'Vijayawada' },
  // Punjab
  { code:'PB-LDH', name:'Ludhiana', stateCode:'PB', headquarters:'Ludhiana' },
  { code:'PB-AMR', name:'Amritsar', stateCode:'PB', headquarters:'Amritsar' },
  // Haryana
  { code:'HR-GGN', name:'Gurugram', stateCode:'HR', headquarters:'Gurugram' },
  { code:'HR-FBD', name:'Faridabad', stateCode:'HR', headquarters:'Faridabad' },
  // Bihar
  { code:'BR-PAT', name:'Patna', stateCode:'BR', headquarters:'Patna' },
  // Goa
  { code:'GA-NGO', name:'North Goa', stateCode:'GA', headquarters:'Panaji' },
  { code:'GA-SGO', name:'South Goa', stateCode:'GA', headquarters:'Margao' },
];

export interface IndianCity {
  code: string;
  name: string;
  stateCode: string;
  districtCode: string;
  isMajor: boolean;
  category: string;
}

export const indianCities: IndianCity[] = [
  // Maharashtra
  { code:'MH-MUM-CT001', name:'Mumbai', stateCode:'MH', districtCode:'MH-MUM', isMajor:true, category:'metro' },
  { code:'MH-PUN-CT001', name:'Pune', stateCode:'MH', districtCode:'MH-PUN', isMajor:true, category:'metro' },
  { code:'MH-NAG-CT001', name:'Nagpur', stateCode:'MH', districtCode:'MH-NAG', isMajor:true, category:'tier1' },
  { code:'MH-THN-CT001', name:'Thane', stateCode:'MH', districtCode:'MH-THN', isMajor:true, category:'tier1' },
  { code:'MH-NSK-CT001', name:'Nashik', stateCode:'MH', districtCode:'MH-NSK', isMajor:false, category:'tier1' },
  { code:'MH-AUR-CT001', name:'Aurangabad', stateCode:'MH', districtCode:'MH-AUR', isMajor:false, category:'tier1' },
  { code:'MH-MUMS-CT001', name:'Navi Mumbai', stateCode:'MH', districtCode:'MH-MUMS', isMajor:true, category:'tier1' },
  // Delhi
  { code:'DL-CEN-CT001', name:'New Delhi', stateCode:'DL', districtCode:'DL-NEW', isMajor:true, category:'metro' },
  { code:'DL-SOU-CT001', name:'South Delhi', stateCode:'DL', districtCode:'DL-SOU', isMajor:true, category:'metro' },
  // Karnataka
  { code:'KA-BLR-CT001', name:'Bengaluru', stateCode:'KA', districtCode:'KA-BLR-U', isMajor:true, category:'metro' },
  { code:'KA-MYS-CT001', name:'Mysuru', stateCode:'KA', districtCode:'KA-MYS', isMajor:false, category:'tier1' },
  { code:'KA-MNG-CT001', name:'Mangaluru', stateCode:'KA', districtCode:'KA-MNG', isMajor:false, category:'tier2' },
  { code:'KA-HUB-CT001', name:'Hubballi-Dharwad', stateCode:'KA', districtCode:'KA-HUB', isMajor:false, category:'tier2' },
  // Tamil Nadu
  { code:'TN-CHN-CT001', name:'Chennai', stateCode:'TN', districtCode:'TN-CHN', isMajor:true, category:'metro' },
  { code:'TN-CBE-CT001', name:'Coimbatore', stateCode:'TN', districtCode:'TN-CBE', isMajor:true, category:'tier1' },
  { code:'TN-MDU-CT001', name:'Madurai', stateCode:'TN', districtCode:'TN-MDU', isMajor:false, category:'tier1' },
  // Gujarat
  { code:'GJ-AHM-CT001', name:'Ahmedabad', stateCode:'GJ', districtCode:'GJ-AHM', isMajor:true, category:'metro' },
  { code:'GJ-SUR-CT001', name:'Surat', stateCode:'GJ', districtCode:'GJ-SUR', isMajor:true, category:'metro' },
  { code:'GJ-VAD-CT001', name:'Vadodara', stateCode:'GJ', districtCode:'GJ-VAD', isMajor:false, category:'tier1' },
  { code:'GJ-RJK-CT001', name:'Rajkot', stateCode:'GJ', districtCode:'GJ-RJK', isMajor:false, category:'tier1' },
  // Uttar Pradesh
  { code:'UP-LKO-CT001', name:'Lucknow', stateCode:'UP', districtCode:'UP-LKO', isMajor:true, category:'tier1' },
  { code:'UP-KNP-CT001', name:'Kanpur', stateCode:'UP', districtCode:'UP-KNP', isMajor:true, category:'tier1' },
  { code:'UP-AGR-CT001', name:'Agra', stateCode:'UP', districtCode:'UP-AGR', isMajor:false, category:'tier1' },
  { code:'UP-VNS-CT001', name:'Varanasi', stateCode:'UP', districtCode:'UP-VNS', isMajor:false, category:'tier1' },
  { code:'UP-NOI-CT001', name:'Noida', stateCode:'UP', districtCode:'UP-NOI', isMajor:true, category:'tier1' },
  // West Bengal
  { code:'WB-KOL-CT001', name:'Kolkata', stateCode:'WB', districtCode:'WB-KOL', isMajor:true, category:'metro' },
  { code:'WB-HOW-CT001', name:'Howrah', stateCode:'WB', districtCode:'WB-HOW', isMajor:false, category:'tier1' },
  // Rajasthan
  { code:'RJ-JPR-CT001', name:'Jaipur', stateCode:'RJ', districtCode:'RJ-JPR', isMajor:true, category:'tier1' },
  { code:'RJ-JDH-CT001', name:'Jodhpur', stateCode:'RJ', districtCode:'RJ-JDH', isMajor:false, category:'tier2' },
  { code:'RJ-UDR-CT001', name:'Udaipur', stateCode:'RJ', districtCode:'RJ-UDR', isMajor:false, category:'tier2' },
  // Kerala
  { code:'KL-EKM-CT001', name:'Kochi', stateCode:'KL', districtCode:'KL-EKM', isMajor:true, category:'tier1' },
  { code:'KL-TVM-CT001', name:'Thiruvananthapuram', stateCode:'KL', districtCode:'KL-TVM', isMajor:false, category:'tier1' },
  // Telangana
  { code:'TS-HYD-CT001', name:'Hyderabad', stateCode:'TS', districtCode:'TS-HYD', isMajor:true, category:'metro' },
  // Andhra Pradesh
  { code:'AP-VSK-CT001', name:'Visakhapatnam', stateCode:'AP', districtCode:'AP-VSK', isMajor:true, category:'tier1' },
  { code:'AP-VJW-CT001', name:'Vijayawada', stateCode:'AP', districtCode:'AP-VJW', isMajor:false, category:'tier1' },
  // Punjab
  { code:'PB-LDH-CT001', name:'Ludhiana', stateCode:'PB', districtCode:'PB-LDH', isMajor:false, category:'tier1' },
  { code:'PB-AMR-CT001', name:'Amritsar', stateCode:'PB', districtCode:'PB-AMR', isMajor:false, category:'tier1' },
  // Haryana
  { code:'HR-GGN-CT001', name:'Gurugram', stateCode:'HR', districtCode:'HR-GGN', isMajor:true, category:'tier1' },
  { code:'HR-FBD-CT001', name:'Faridabad', stateCode:'HR', districtCode:'HR-FBD', isMajor:false, category:'tier1' },
  // Bihar
  { code:'BR-PAT-CT001', name:'Patna', stateCode:'BR', districtCode:'BR-PAT', isMajor:true, category:'tier1' },
  // Goa
  { code:'GA-NGO-CT001', name:'Panaji', stateCode:'GA', districtCode:'GA-NGO', isMajor:false, category:'tier3' },
  { code:'GA-SGO-CT001', name:'Margao', stateCode:'GA', districtCode:'GA-SGO', isMajor:false, category:'tier3' },
];

// ── Helper functions ──────────────────────────────────────────
export function getDistrictsByState(stateCode: string): IndianDistrict[] {
  return indianDistricts.filter(d => d.stateCode === stateCode);
}

export function getCitiesByState(stateCode: string): IndianCity[] {
  return indianCities.filter(c => c.stateCode === stateCode);
}

export function getCitiesByDistrict(districtCode: string): IndianCity[] {
  return indianCities.filter(c => c.districtCode === districtCode);
}
