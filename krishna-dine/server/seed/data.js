'use strict';
// Sample data for local development and first deployment. All items are vegetarian.

const categories = [
  { name: 'Starters', description: 'Crispy, smoky bites to begin your meal', displayOrder: 1 },
  { name: 'Soups', description: 'Warm bowls, freshly simmered', displayOrder: 2 },
  { name: 'Chinese', description: 'Indo-Chinese favourites from the wok', displayOrder: 3 },
  { name: 'South Indian', description: 'Dosas, idlis and more with sambar and chutney', displayOrder: 4 },
  { name: 'Main Course', description: 'Rich curries and classic North Indian gravies', displayOrder: 5 },
  { name: 'Indian Breads', description: 'Fresh from the tandoor', displayOrder: 6 },
  { name: 'Rice and Biryani', description: 'Fragrant basmati, slow cooked', displayOrder: 7 },
  { name: 'Beverages', description: 'Chilled and hot drinks', displayOrder: 8 },
  { name: 'Desserts', description: 'Something sweet to finish', displayOrder: 9 },
];

const items = [
  ['Starters', 'Paneer Tikka', 'Cottage cheese cubes marinated in spiced yoghurt and chargrilled in the tandoor.', 249, 20],
  ['Starters', 'Hara Bhara Kebab', 'Spinach, green peas and potato patties with mild spices, shallow fried.', 199, 15],
  ['Starters', 'Veg Spring Rolls', 'Crisp rolls stuffed with stir-fried vegetables, served with sweet chilli dip.', 179, 15],
  ['Soups', 'Tomato Shorba', 'Slow-cooked tomato soup tempered with cumin and fresh coriander.', 119, 10],
  ['Soups', 'Sweet Corn Soup', 'Creamy sweet corn and vegetable soup.', 129, 10],
  ['Soups', 'Hot and Sour Soup', 'Spicy, tangy soup with mushrooms, cabbage and tofu.', 139, 10],
  ['Chinese', 'Veg Manchurian', 'Vegetable dumplings tossed in a tangy soy-garlic gravy.', 219, 15],
  ['Chinese', 'Chilli Paneer', 'Crispy paneer with bell peppers and onions in a spicy chilli sauce.', 259, 15],
  ['Chinese', 'Veg Hakka Noodles', 'Wok-tossed noodles with crunchy vegetables.', 199, 12],
  ['South Indian', 'Masala Dosa', 'Crisp rice crepe filled with spiced potato, with sambar and chutneys.', 149, 12],
  ['South Indian', 'Idli Sambar', 'Three steamed rice cakes with sambar and coconut chutney.', 109, 10],
  ['South Indian', 'Medu Vada', 'Crispy lentil doughnuts served with sambar and chutney.', 119, 12],
  ['Main Course', 'Paneer Butter Masala', 'Paneer simmered in a velvety tomato, butter and cashew gravy.', 289, 20],
  ['Main Course', 'Dal Makhani', 'Black lentils slow-cooked overnight with butter and cream.', 239, 15],
  ['Main Course', 'Kadai Mix Veg', 'Seasonal vegetables cooked with freshly ground kadai masala.', 229, 18],
  ['Main Course', 'Shahi Malai Kofta', 'Paneer and potato dumplings in a rich, mildly sweet cashew gravy.', 279, 20],
  ['Indian Breads', 'Butter Naan', 'Soft leavened bread from the tandoor, brushed with butter.', 59, 8],
  ['Indian Breads', 'Tandoori Roti', 'Whole wheat bread baked in the clay oven.', 29, 6],
  ['Indian Breads', 'Garlic Naan', 'Naan topped with garlic and fresh coriander.', 79, 8],
  ['Rice and Biryani', 'Veg Dum Biryani', 'Basmati rice and vegetables slow cooked with saffron and whole spices, with raita.', 249, 25],
  ['Rice and Biryani', 'Jeera Rice', 'Basmati rice tempered with cumin and ghee.', 149, 10],
  ['Beverages', 'Masala Chai', 'Hot tea brewed with milk, ginger and cardamom.', 39, 5],
  ['Beverages', 'Sweet Lassi', 'Chilled churned yoghurt drink.', 89, 5],
  ['Desserts', 'Gulab Jamun', 'Two warm milk dumplings soaked in rose-cardamom syrup.', 89, 5],
  ['Desserts', 'Rasmalai', 'Soft paneer discs in chilled saffron milk with pistachios.', 119, 5],
];

module.exports = { categories, items };
