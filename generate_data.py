import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import random
import string

np.random.seed(42)
random.seed(42)

# Configuration
TOTAL_REVIEWS = 10000
SPAM_PERCENTAGE = 0.15
NUM_SPAM_REVIEWS = int(TOTAL_REVIEWS * SPAM_PERCENTAGE)
NUM_GENUINE_REVIEWS = TOTAL_REVIEWS - NUM_SPAM_REVIEWS

TOTAL_PRODUCTS = 500
TOTAL_USERS = 2000
TARGET_PRODUCTS_COUNT = 30
SPAMMER_USERS_COUNT = 50

# Time range for dataset
start_date = datetime(2024, 1, 1)
end_date = datetime(2024, 12, 31)
date_range_days = (end_date - start_date).days

# Genuine review templates (diverse)
genuine_templates = [
    "This product is excellent! I'm very satisfied with the quality and performance.",
    "Great value for money. Highly recommend this to anyone looking for a reliable product.",
    "Amazing product! Arrived quickly and works as described. Very happy with my purchase.",
    "Perfect! Exactly what I was looking for. Good quality and fast shipping.",
    "Love this product! It exceeded my expectations. Will definitely buy again.",
    "Fantastic purchase. The product quality is outstanding and customer service was helpful.",
    "Wonderful product! I've been using it for weeks and it's still working great.",
    "Highly satisfied with this purchase. Great product at a fair price.",
    "Excellent quality and fast delivery. Very impressed with this product.",
    "This product is a game changer! Highly recommend it to everyone.",
    "Very good product. Works perfectly and looks great. Worth every penny.",
    "Impressed with the quality and durability. Great value for the price.",
    "Outstanding product! Exactly as described and arrived in perfect condition.",
    "Really happy with this purchase. Quality is top-notch and delivery was fast.",
    "Best purchase I've made in a while! Highly recommend this product.",
]

# Spam templates (highly similar, repetitive)
spam_templates = [
    "Amazing product! 5 stars! Best quality ever! Must buy!",
    "5 stars! Excellent! Best deal! Amazing quality! Recommend!",
    "Best product ever! 5 stars! Amazing! Must buy! Great!",
    "Excellent quality! 5 stars! Amazing deal! Perfect!",
    "Amazing! 5 stars! Best quality! Highly recommend!",
    "Perfect product! 5 stars! Amazing! Best deal!",
]

print(f"Generating {TOTAL_REVIEWS} reviews ({NUM_SPAM_REVIEWS} spam, {NUM_GENUINE_REVIEWS} genuine)...")
print(f"Target products: {TARGET_PRODUCTS_COUNT}, Spammer users: {SPAMMER_USERS_COUNT}")

# Select target products for spam ring
target_products = np.random.choice(TOTAL_PRODUCTS, TARGET_PRODUCTS_COUNT, replace=False)

# Select spammer users
spammer_users = np.random.choice(TOTAL_USERS, SPAMMER_USERS_COUNT, replace=False)

# Select legitimate products and users (non-overlapping with spammers for initial split)
legitimate_products = np.setdiff1d(np.arange(TOTAL_PRODUCTS), target_products)
legitimate_users = np.setdiff1d(np.arange(TOTAL_USERS), spammer_users)

data = []
review_id = 1

# === Generate GENUINE REVIEWS ===
print("Generating genuine reviews...")
for i in range(NUM_GENUINE_REVIEWS):
    # Normal distribution for timestamps (centered around mid-year)
    days_offset = int(np.random.normal(date_range_days / 2, date_range_days / 6))
    days_offset = max(0, min(days_offset, date_range_days))
    timestamp = start_date + timedelta(days=days_offset, hours=np.random.randint(0, 24))
    
    # Can be from any product
    product_id = np.random.choice(TOTAL_PRODUCTS)
    
    # Prefer legitimate users, but allow any
    user_id = np.random.choice(TOTAL_USERS)
    
    # Diverse ratings (skewed toward higher ratings, normal distribution)
    rating = np.clip(int(np.random.normal(4, 1)), 1, 5)
    
    # Diverse review text
    review_text = random.choice(genuine_templates)
    
    data.append({
        'Review_ID': review_id,
        'User_ID': user_id,
        'Product_ID': product_id,
        'Review_Text': review_text,
        'Timestamp': timestamp,
        'Rating': rating,
        'Is_Spam': False
    })
    review_id += 1

# === Generate SPAM REVIEWS (Temporal Spam Ring) ===
print("Generating spam reviews (temporal spam ring behavior)...")

# Create a tight 72-hour window for spam burst
spam_burst_start = start_date + timedelta(days=np.random.randint(30, date_range_days - 100))
spam_burst_end = spam_burst_start + timedelta(hours=72)

spam_reviews_per_target = NUM_SPAM_REVIEWS // TARGET_PRODUCTS_COUNT
remainder_spam = NUM_SPAM_REVIEWS % TARGET_PRODUCTS_COUNT

for product_idx, product_id in enumerate(target_products):
    # Distribute spam reviews across target products
    num_spam_for_product = spam_reviews_per_target + (1 if product_idx < remainder_spam else 0)
    
    for j in range(num_spam_for_product):
        # All spam reviews are 5-star
        rating = 5
        
        # Timestamps within the tight 72-hour window
        seconds_in_window = int((spam_burst_end - spam_burst_start).total_seconds())
        random_seconds = np.random.randint(0, seconds_in_window)
        timestamp = spam_burst_start + timedelta(seconds=random_seconds)
        
        # From spammer users
        user_id = np.random.choice(spammer_users)
        
        # Highly similar review text from templates (repetitive with slight variations)
        base_template = random.choice(spam_templates)
        # Add slight variations but keep similarity high
        review_text = base_template
        
        data.append({
            'Review_ID': review_id,
            'User_ID': user_id,
            'Product_ID': product_id,
            'Review_Text': review_text,
            'Timestamp': timestamp,
            'Rating': rating,
            'Is_Spam': True
        })
        review_id += 1

# Create DataFrame
df = pd.DataFrame(data)

# Shuffle the dataset
df = df.sample(frac=1, random_state=42).reset_index(drop=True)

# Sort by timestamp for better visualization
df = df.sort_values('Timestamp').reset_index(drop=True)

# === Verify cosine similarity of spam reviews ===
spam_df = df[df['Is_Spam'] == True]
if len(spam_df) > 1:
    vectorizer = TfidfVectorizer()
    spam_texts = spam_df['Review_Text'].values
    tfidf_matrix = vectorizer.fit_transform(spam_texts)
    similarity_matrix = cosine_similarity(tfidf_matrix)
    
    # Calculate average similarity
    # Get upper triangle of similarity matrix (excluding diagonal)
    upper_triangle_indices = np.triu_indices(len(similarity_matrix), k=1)
    if len(upper_triangle_indices[0]) > 0:
        avg_similarity = np.mean(similarity_matrix[upper_triangle_indices])
        print(f"Average cosine similarity of spam reviews: {avg_similarity:.4f}")

# Save to CSV
output_file = '/Users/sarvesh/Desktop/Fake_Review_EDI/synthetic_reviews.csv'
df.to_csv(output_file, index=False)

print(f"\n=== Dataset Generation Complete ===")
print(f"Total reviews: {len(df)}")
print(f"Spam reviews: {len(df[df['Is_Spam'] == True])} ({len(df[df['Is_Spam'] == True]) / len(df) * 100:.2f}%)")
print(f"Genuine reviews: {len(df[df['Is_Spam'] == False])}")
print(f"\nSpam Statistics:")
print(f"  - Target products: {TARGET_PRODUCTS_COUNT} (IDs: {list(target_products[:5])}...)")
print(f"  - Spammer users: {SPAMMER_USERS_COUNT} (IDs: {list(spammer_users[:5])}...)")
print(f"  - Spam burst window: {spam_burst_start} to {spam_burst_end}")
print(f"  - Spam rating distribution: {spam_df['Rating'].value_counts().to_dict()}")
print(f"\nGeneric Statistics:")
print(f"  - Rating distribution:\n{df['Rating'].value_counts().sort_index()}")
print(f"  - Timestamp range: {df['Timestamp'].min()} to {df['Timestamp'].max()}")
print(f"  - Unique products: {df['Product_ID'].nunique()}")
print(f"  - Unique users: {df['User_ID'].nunique()}")
print(f"\nOutput file: {output_file}")

