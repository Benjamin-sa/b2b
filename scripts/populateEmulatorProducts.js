// This script populates the Firestore emulator with test products ONLY (never touches live DB)
// Usage: node scripts/populateEmulatorProducts.js

import admin from "firebase-admin";

// Initialize Firebase Admin for EMULATOR USE ONLY
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "motordash-cf401", // Match the frontend project ID
  });
}

const db = admin.firestore();

// Configure Firestore to use the emulator
if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log(
    `🔧 Using Firestore emulator at: ${process.env.FIRESTORE_EMULATOR_HOST}`
  );
} else {
  console.log("🔧 Setting Firestore emulator to localhost:8086");
  process.env.FIRESTORE_EMULATOR_HOST = "localhost:8086";
}

// Set emulator settings
db.settings({
  host: "localhost:8086",
  ssl: false,
});

// Comprehensive product data generator using built-in random functions
function generateRandomProduct() {
  const categories = [
    "Engine Parts",
    "Transmission",
    "Brakes",
    "Suspension",
    "Electrical",
    "Filters",
    "Belts & Hoses",
    "Exhaust",
    "Cooling System",
    "Fuel System",
    "Body Parts",
    "Interior",
    "Wheels & Tires",
    "Tools",
    "Fluids & Chemicals",
  ];

  const brands = [
    "Bosch",
    "Denso",
    "Continental",
    "Magneti Marelli",
    "Valeo",
    "Delphi",
    "NGK",
    "Champion",
    "Mahle",
    "Febi",
    "TRW",
    "Sachs",
    "Bilstein",
    "Monroe",
  ];

  const units = ["piece", "set", "liter", "kg", "meter", "pair"];

  const tags = [
    "OEM",
    "Aftermarket",
    "Premium",
    "Economy",
    "Heavy Duty",
    "Racing",
    "Performance",
    "Standard",
    "Professional",
    "DIY",
  ];

  // Generate random values
  const name = generateProductName();
  const category = categories[Math.floor(Math.random() * categories.length)];
  const brand = brands[Math.floor(Math.random() * brands.length)];
  const price = Math.round((Math.random() * 500 + 10) * 100) / 100; // $10 - $510
  const originalPrice =
    Math.random() > 0.7
      ? Math.round(price * (1 + Math.random() * 0.3) * 100) / 100
      : undefined;
  const inStock = Math.random() > 0.1; // 90% chance in stock
  const stock = inStock ? Math.floor(Math.random() * 100) + 1 : 0;

  // Generate SKU once and reuse it for shopifyVariantId
  // This ensures payment system has required shopifyVariantId metadata
  const generatedSKU = generateSKU();

  const product = {
    name,
    description: generateProductDescription(name, category),
    price,
    imageUrl: `https://picsum.photos/400/300?random=${Math.floor(
      Math.random() * 1000
    )}`,
    images: generateRandomImages(),
    category,
    sku: generatedSKU,
    shopifyVariantId: generatedSKU, // Required for payment system - must match item metadata
    inStock,
    stock,
    brand,
    partNumber: generatePartNumber(),
    specifications: generateSpecifications(category),
    unit: units[Math.floor(Math.random() * units.length)],
    minOrderQuantity: Math.floor(Math.random() * 5) + 1,
    maxOrderQuantity: Math.floor(Math.random() * 50) + 10,
    tags: generateRandomTags(tags),
    weight: Math.round((Math.random() * 20 + 0.1) * 100) / 100, // 0.1kg - 20kg
    dimensions: {
      length: Math.round((Math.random() * 100 + 1) * 100) / 100,
      width: Math.round((Math.random() * 100 + 1) * 100) / 100,
      height: Math.round((Math.random() * 100 + 1) * 100) / 100,
    },
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
  };

  // Add originalPrice only if it exists (to avoid Firestore undefined values)
  if (originalPrice) {
    product.originalPrice = originalPrice;
  }

  return product;
}

function generateProductName() {
  const productTypes = [
    "Brake Pad",
    "Oil Filter",
    "Air Filter",
    "Spark Plug",
    "Belt",
    "Shock Absorber",
    "Radiator",
    "Alternator",
    "Battery",
    "Tire",
    "Headlight",
    "Bumper",
    "Mirror",
    "Gasket",
    "Pump",
    "Sensor",
    "Valve",
    "Bearing",
    "Clutch",
    "Starter",
  ];

  const adjectives = [
    "Premium",
    "Heavy Duty",
    "Performance",
    "OEM",
    "Standard",
    "Professional",
    "Economy",
    "High Quality",
    "Durable",
    "Reliable",
  ];

  const productType =
    productTypes[Math.floor(Math.random() * productTypes.length)];
  const adjective =
    Math.random() > 0.5
      ? adjectives[Math.floor(Math.random() * adjectives.length)] + " "
      : "";

  return `${adjective}${productType}`;
}

function generateProductDescription(name, category) {
  const descriptions = [
    `High-quality ${name.toLowerCase()} designed for optimal performance and durability. Perfect for ${category.toLowerCase()} applications.`,
    `Professional-grade ${name.toLowerCase()} that meets or exceeds OEM specifications. Ideal for both professional mechanics and DIY enthusiasts.`,
    `Reliable ${name.toLowerCase()} engineered for long-lasting performance. Compatible with a wide range of vehicle models.`,
    `Premium ${name.toLowerCase()} featuring advanced materials and precision manufacturing for superior quality and performance.`,
    `Durable ${name.toLowerCase()} designed to withstand harsh conditions and provide consistent performance over time.`,
  ];

  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

function generateSKU() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  let sku = "";

  // 2-3 letters followed by 4-6 numbers
  for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
    sku += letters[Math.floor(Math.random() * letters.length)];
  }
  for (let i = 0; i < 4 + Math.floor(Math.random() * 3); i++) {
    sku += numbers[Math.floor(Math.random() * numbers.length)];
  }

  return sku;
}

function generatePartNumber() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  let partNumber = "";

  // Format: XXX-XXXX-XX or XXXX-XXX
  const format = Math.random() > 0.5;
  if (format) {
    // XXX-XXXX-XX
    for (let i = 0; i < 3; i++)
      partNumber += letters[Math.floor(Math.random() * letters.length)];
    partNumber += "-";
    for (let i = 0; i < 4; i++)
      partNumber += numbers[Math.floor(Math.random() * numbers.length)];
    partNumber += "-";
    for (let i = 0; i < 2; i++)
      partNumber += letters[Math.floor(Math.random() * letters.length)];
  } else {
    // XXXX-XXX
    for (let i = 0; i < 4; i++)
      partNumber += numbers[Math.floor(Math.random() * numbers.length)];
    partNumber += "-";
    for (let i = 0; i < 3; i++)
      partNumber += letters[Math.floor(Math.random() * letters.length)];
  }

  return partNumber;
}

function generateSpecifications(category) {
  const specs = {
    "Engine Parts": [
      { key: "Material", value: "Cast Iron" },
      { key: "Operating Temperature", value: "-40°C to +150°C" },
      { key: "Compatibility", value: "Universal" },
    ],
    Brakes: [
      { key: "Material", value: "Ceramic Composite" },
      { key: "Friction Coefficient", value: "0.35-0.45" },
      { key: "Temperature Range", value: "-40°C to +650°C" },
    ],
    Electrical: [
      { key: "Voltage", value: "12V" },
      { key: "Current", value: "15A" },
      { key: "Connector Type", value: "Standard" },
    ],
  };

  const defaultSpecs = [
    { key: "Warranty", value: "2 Years" },
    { key: "Origin", value: "OEM Quality" },
    { key: "Installation", value: "Professional Recommended" },
  ];

  return specs[category] || defaultSpecs;
}

function generateRandomImages() {
  const imageCount = Math.floor(Math.random() * 4) + 1; // 1-4 images
  const images = [];

  for (let i = 0; i < imageCount; i++) {
    images.push(
      `https://picsum.photos/400/300?random=${
        Math.floor(Math.random() * 1000) + i
      }`
    );
  }

  return images;
}

function generateRandomTags(allTags) {
  const tagCount = Math.floor(Math.random() * 4) + 1; // 1-4 tags
  const shuffled = [...allTags].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, tagCount);
}

async function addProducts(count = 50) {
  console.log(`🚀 Starting to populate emulator with ${count} products...`);

  try {
    for (let i = 0; i < count; i++) {
      console.log(`Adding product ${i + 1}/${count}...`);
      const product = generateRandomProduct();
      await db.collection("products").add(product);

      if ((i + 1) % 10 === 0) {
        console.log(`📦 ${i + 1}/${count} products added`);
      }
    }

    console.log("✅ All products added successfully!");
    console.log(`🎉 Populated emulator with ${count} products`);
  } catch (error) {
    console.error("❌ Error adding products:", error.message);
    process.exit(1);
  }
}

// Get count from command line argument or use default
const count = process.argv[2] ? parseInt(process.argv[2]) : 50;

if (isNaN(count) || count <= 0) {
  console.error("❌ Please provide a valid number of products to create");
  console.log("Usage: node populateEmulatorProducts.js [count]");
  console.log("Example: node populateEmulatorProducts.js 100");
  process.exit(1);
}

addProducts(count)
  .then(() => {
    console.log("🎯 Script completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });
