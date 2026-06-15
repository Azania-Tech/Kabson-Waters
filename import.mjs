import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, addDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCxomghC49dzQTeQeiNl1Vs2f9s572FWtE",
  authDomain: "kabson-water.firebaseapp.com",
  projectId: "kabson-water",
  storageBucket: "kabson-water.firebasestorage.app",
  messagingSenderId: "947809006920",
  appId: "1:947809006920:web:4d2f6dca78181ce4636f7d",
  measurementId: "G-W81X375TZ5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CUSTOMER_LIST = [
  "Muigai Annex",
  "TRAQO KISASA",
  "Wakaba's place",
  "Red Eagle's",
  "Sarvid Hotel",
  "Tobriana Hotel",
  "Babylon Classic",
  "Club unit",
  "Klub Makuti",
  "Almasi Resort",
  "Kimende Annex",
  "KQ Hotel",
  "Honeybee Hotel",
  "Kimende Annex",
  "Midway Resort",
  "Sweet water",
  "The Spot",
  "Kibii police Station",
  "Kabson Waters",
  "Potters Inn Club",
  "Hotpot Annex",
  "Tayanas",
  "HillQera",
  "2 IN 1 Restaurant",
  "Kiambu Road",
  "Acacia bar &lounge",
  "Rwathia bar& lounge",
  "EL Carlos",
  "Neco counselling",
  "Digital Media",
  "Utopia Resort",
  "Bristar School",
  "Precious Blood School"
];

async function run() {
  console.log("Connecting to Firestore...");
  const customersRef = collection(db, "customers");
  
  console.log("Fetching existing customers...");
  const snapshot = await getDocs(customersRef);
  console.log(`Found ${snapshot.size} customers. Deleting...`);
  
  let deletedCount = 0;
  for (const d of snapshot.docs) {
    await deleteDoc(doc(db, "customers", d.id));
    deletedCount++;
  }
  console.log(`Deleted ${deletedCount} customers.`);
  
  console.log("Adding new customers...");
  // Ensure uniqueness
  const uniqueCustomers = Array.from(new Set(CUSTOMER_LIST));
  
  let addedCount = 0;
  for (const name of uniqueCustomers) {
    await addDoc(customersRef, {
      name: name,
      phone: "-",
      email: "-",
      totalPurchases: 0,
      loyaltyPoints: 0,
      creditLimit: 0,
      creditBalance: 0,
      createdAt: new Date().toISOString(),
      lastPurchase: new Date().toISOString(),
    });
    addedCount++;
  }
  
  console.log(`Successfully added ${addedCount} new customers.`);
  process.exit(0);
}

run().catch(console.error);
