import requests
import json

# API endpoint
url = "http://localhost:3000/api/ausbildung/reset-letters"

# JWT token (replace with your current token)
token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtZzQ4enhnaTAwMDB1aW11amx1cHQ4MDgiLCJlbWFpbCI6ImFuYXNzYWhmaWRpLmF1c3NiaWxkdW5nQGdtYWlsLmNvbSIsImlhdCI6MTc1OTA5NzExMiwiZXhwIjoxNzU5NzAxOTEyfQ.K1P1TXidpjSO2GUF8KbBe18TyDQYUYd7PjCV-0k2ho4"

# Authorization headers
headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {token}"
}

def reset_all_motivation_letters():
    """
    Reset all motivation letters for the authenticated user.
    This will:
    1. Delete all motivation letter PDFs
    2. Change all job statuses back to "Pending"
    """
    try:
        print("🔄 Resetting all motivation letters...")
        
        response = requests.delete(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ SUCCESS: All motivation letters have been reset!")
            print(f"📊 Stats:")
            print(f"   • Total jobs: {data['stats']['totalJobs']}")
            print(f"   • Jobs with letters removed: {data['stats']['jobsWithLettersRemoved']}")
            print(f"   • Jobs updated: {data['stats']['jobsUpdated']}")
            print(f"   • Previously pending: {data['stats']['previouslyPending']}")
            print(f"\n💡 Message: {data['message']}")
            
            return True
        else:
            print(f"❌ FAILED: {response.status_code}")
            print(f"Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"⚠️ ERROR: {e}")
        return False

def confirm_reset():
    """Ask for user confirmation before resetting"""
    print("⚠️  WARNING: This will DELETE ALL motivation letters and reset job statuses!")
    print("⚠️  This action cannot be undone!")
    
    confirmation = input("\n🤔 Are you sure you want to continue? (type 'yes' to confirm): ")
    
    if confirmation.lower() == 'yes':
        return True
    else:
        print("❌ Operation cancelled.")
        return False

if __name__ == "__main__":
    print("🧹 Motivation Letters Reset Tool")
    print("=" * 40)
    
    if confirm_reset():
        success = reset_all_motivation_letters()
        
        if success:
            print("\n🎉 All done! You can now generate new motivation letters.")
        else:
            print("\n💥 Something went wrong. Check your token and server status.")
    else:
        print("\n👋 Goodbye!")