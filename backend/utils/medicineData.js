import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define function to get medicine data from CSV
export async function getMedicines() {
  const medicines = [];
  const csvPath = path.join(__dirname, '..', '..', 'A_Z_medicines_dataset_of_India.csv');

  return new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (data) => {
        medicines.push({
          id: data.id,
          name: data.name,
          price: data['price(₹)'],
          manufacturer: data.manufacturer_name,
          type: data.type,
          packSize: data.pack_size_label,
          composition1: data.short_composition1,
          composition2: data.short_composition2
        });
      })
      .on('end', () => {
        resolve(medicines);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

// Add endpoint to get medicines
export async function getMedicinesHandler(req, res) {
  try {
    const medicines = await getMedicines();
    
    // Support filtering by name if query param is provided
    const { search } = req.query;
    if (search) {
      const filtered = medicines.filter(med => 
        med.name.toLowerCase().includes(search.toLowerCase())
      );
      return res.json(filtered);
    }
    
    return res.json(medicines);
  } catch (err) {
    console.error('Error getting medicine data:', err);
    res.status(500).json({ message: 'Failed to retrieve medicine data' });
  }
}
