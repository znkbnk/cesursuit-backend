require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Suit = require('./models/Suit');

const suitsData = [
  {
    "name": "The Bespoke Monarch",
    "price": 2499,
    "fabric": "Super 180s Italian Wool",
    "style": "business",
    "description": "Hand-stitched by master tailors in Naples. Limited to 50 pieces worldwide.",
    "stock": 12,
    "image": "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
  },
  {
    "name": "The Noir Tuxedo",
    "price": 3199,
    "fabric": "French Silk & Cashmere Blend",
    "style": "tuxedo",
    "description": "Worn by Oscar winners. The definition of black-tie elegance.",
    "stock": 8,
    "image": "https://images.unsplash.com/photo-1551232864-3f0890e580d9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
  },
  {
    "name": "The Aristocrat Overcoat",
    "price": 1899,
    "fabric": "Scottish Tweed & Vicuña",
    "style": "overcoat",
    "description": "For those who command respect without saying a word.",
    "stock": 5,
    "image": "https://images.unsplash.com/photo-1479064555552-3ef4979f8908?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
  },
  {
    "name": "The Regal Blazer",
    "price": 1599,
    "fabric": "English Wool & Cashmere",
    "style": "blazer",
    "description": "Timeless sophistication, tailored for the modern gentleman.",
    "stock": 15,
    "image": "https://images.pexels.com/photos/16383205/pexels-photo-16383205/free-photo-of-portrait-of-a-male-model-wearing-a-crown-and-a-white-jacket.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
  },
  {
    "name": "The Midnight Velvet Suit",
    "price": 2799,
    "fabric": "Italian Velvet",
    "style": "business",
    "description": "A bold statement of luxury, crafted for evening elegance.",
    "stock": 10,
    "image": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
  },
  {
    "name": "The Highland Trench",
    "price": 2199,
    "fabric": "Water-Repellent British Wool",
    "style": "trenchcoat",
    "description": "Inspired by Scottish heritage, built to withstand any storm.",
    "stock": 7,
    "image": "https://images.pexels.com/photos/1643025/pexels-photo-1643025.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
  },
  {
    "name": "The Diplomat Three-Piece",
    "price": 3499,
    "fabric": "Super 150s Merino Wool",
    "style": "business",
    "description": "Exudes authority and refinement, favored by global leaders.",
    "stock": 6,
    "image": "https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
  },
  {
    "name": "The Equestrian Jacket",
    "price": 1999,
    "fabric": "Corduroy & Loro Piana Wool",
    "style": "casual",
    "description": "Rustic charm meets modern tailoring for countryside elegance.",
    "stock": 9,
    "image": "https://images.pexels.com/photos/14233064/pexels-photo-14233064.jpeg"
  }
];

const seedDatabase = async () => {
  try {
    await connectDB();
    
    // Clear existing data
    await Suit.deleteMany({});
    
    // Insert new data
    await Suit.insertMany(suitsData);
    
    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();