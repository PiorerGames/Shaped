import axios from 'axios';

const API_BASE_URL = 'https://world.openfoodfacts.org/cgi';

export interface OpenFoodFactsProduct {
  product_name: string;
  brands?: string;
  nutriments: {
    'energy-kcal_100g'?: number;
    'proteins_100g'?: number;
    'fat_100g'?: number;
    'carbohydrates_100g'?: number;
  };
  serving_size?: string;
  serving_quantity?: number;
}

export interface FoodSearchResult {
  name: string;
  brand?: string;
  barcode: string;
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
  serving_size: number;
  serving_unit: string;
}

export async function searchProductByBarcode(barcode: string): Promise<FoodSearchResult | null> {
  try {
    const response = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
      timeout: 10000,
    });
    
    if (response.data.status === 0 || !response.data.product) {
      return null;
    }

    const product: OpenFoodFactsProduct = response.data.product;
    const nutriments = product.nutriments || {};

    // Parse serving size
    let servingSize = 100;
    let servingUnit = 'g';
    
    if (product.serving_quantity) {
      servingSize = product.serving_quantity;
    } else if (product.serving_size) {
      const match = product.serving_size.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/);
      if (match) {
        servingSize = parseFloat(match[1]);
        servingUnit = match[2];
      }
    }

    return {
      name: product.product_name || 'Unknown Product',
      brand: product.brands,
      barcode,
      calories: nutriments['energy-kcal_100g'] || 0,
      protein: nutriments['proteins_100g'] || 0,
      fats: nutriments['fat_100g'] || 0,
      carbs: nutriments['carbohydrates_100g'] || 0,
      serving_size: servingSize,
      serving_unit: servingUnit,
    };
  } catch (error) {
    console.error('Error fetching product from OpenFoodFacts:', error);
    return null;
  }
}

export async function searchProducts(query: string): Promise<FoodSearchResult[]> {
  try {
    console.log('Searching OpenFoodFacts for:', query);
    // Use HTTPS API endpoint (works better in Expo Go)
    const response = await axios.get(`https://world.openfoodfacts.net/cgi/search.pl`, {
      params: {
        search_terms: query,
        search_simple: 1,
        action: 'process',
        page_size: 30,
        json: 1,
        fields: 'product_name,product_name_en,brands,code,nutriments,serving_size,serving_quantity',
      },
      timeout: 15000,
      headers: {
        'User-Agent': 'ShapedFitnessApp/1.0',
        'Accept': 'application/json',
      },
    });

    console.log('API response products count:', response.data.products?.length || 0);

    if (!response.data.products || response.data.products.length === 0) {
      return [];
    }

    const filteredProducts = response.data.products
      .filter((p: any) => {
        // Filter products that have product names and nutriments
        if (!p.nutriments) return false;
        
        // Check if product has English name or contains Latin characters
        const productName = p.product_name_en || p.product_name || '';
        if (!productName) return false;
        
        // Check if the name contains mostly Latin characters (not other scripts)
        const latinCharacters = productName.match(/[a-zA-Z0-9\s\-,.'()]/g);
        const hasEnoughLatinChars = latinCharacters && latinCharacters.length / productName.length > 0.5;
        
        return hasEnoughLatinChars;
      })
      .map((product: any) => {
        const nutriments = product.nutriments || {};
        
        let servingSize = 100;
        let servingUnit = 'g';
        
        if (product.serving_quantity) {
          servingSize = product.serving_quantity;
        } else if (product.serving_size) {
          const match = product.serving_size.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/);
          if (match) {
            servingSize = parseFloat(match[1]);
            servingUnit = match[2];
          }
        }

        return {
          name: product.product_name_en || product.product_name,
          brand: product.brands,
          barcode: product.code || '',
          calories: nutriments['energy-kcal_100g'] || 0,
          protein: nutriments['proteins_100g'] || 0,
          fats: nutriments['fat_100g'] || 0,
          carbs: nutriments['carbohydrates_100g'] || 0,
          serving_size: servingSize,
          serving_unit: servingUnit,
        };
      });
    
    console.log('Filtered products count:', filteredProducts.length);
    return filteredProducts;
  } catch (error) {
    console.error('Error searching products:', error);
    return [];
  }
}

// Basic food items that can be used as fallback
export const BASIC_FOODS: FoodSearchResult[] = [
  {
    name: 'White Rice (cooked)',
    barcode: 'basic_rice',
    calories: 130,
    protein: 2.7,
    fats: 0.3,
    carbs: 28,
    serving_size: 100,
    serving_unit: 'g',
  },
  {
    name: 'Chicken Breast (cooked)',
    barcode: 'basic_chicken',
    calories: 165,
    protein: 31,
    fats: 3.6,
    carbs: 0,
    serving_size: 100,
    serving_unit: 'g',
  },
  {
    name: 'Whole Egg',
    barcode: 'basic_egg',
    calories: 155,
    protein: 13,
    fats: 11,
    carbs: 1.1,
    serving_size: 100,
    serving_unit: 'g',
  },
  {
    name: 'Banana',
    barcode: 'basic_banana',
    calories: 89,
    protein: 1.1,
    fats: 0.3,
    carbs: 23,
    serving_size: 100,
    serving_unit: 'g',
  },
  {
    name: 'Bread (white)',
    barcode: 'basic_bread',
    calories: 265,
    protein: 9,
    fats: 3.2,
    carbs: 49,
    serving_size: 100,
    serving_unit: 'g',
  },
  {
    name: 'Milk (whole)',
    barcode: 'basic_milk',
    calories: 61,
    protein: 3.2,
    fats: 3.3,
    carbs: 4.8,
    serving_size: 100,
    serving_unit: 'ml',
  },
];
