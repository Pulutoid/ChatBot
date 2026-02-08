import Database from 'better-sqlite3';
import { ITEMS, giveItem, removeItem } from './items.js';
import { turnIntoPasteDynuLink } from './paste_dynu_Handler.js';
const db = new Database('rpg.db');
db.pragma('journal_mode = WAL');

// Create shop purchase tracking table (if it doesn't exist)
db.prepare(`
  CREATE TABLE IF NOT EXISTS shop_purchases (
    userId TEXT,
    itemId TEXT,
    purchaseDate DATETIME,
    PRIMARY KEY (userId, itemId)
  )`).run();

const shopItemsTxt = `WEAPONS
| Item            | Effect                       |   Value |
| --------------- | ---------------------------- | ------: |
| Sword           | +2 attack                    | 10 Gold |
| Iron Sword      | +3 attack                    | 20 Gold |
| Enchanted Blade | +4 attack                    | 35 Gold |
| Dragon Slayer   | +6 attack                    | 60 Gold |
| Balanced Dagger | +2 attack, +1 defense        | 25 Gold |
| Staff of Wisdom | +3 attack, +5% quest success | 40 Gold |

HIGH-TIER WEAPONS
----------------------------------------------------------------
| Item             | Effect                       |    Value |
| ---------------- | ---------------------------- | -------: |
| Celestial Blade  | +8 attack, +5% quest success |  85 Gold |
| Void Reaver      | +10 attack                   | 100 Gold |
| Equilibrium Edge | +6 attack, +3 defense        |  95 Gold |
------------------------------------------------------------------

ARMOR
----------------------------------------------------------------
| Item               | Effect                        |   Value |
| ------------------ | ----------------------------- | ------: |
| Shield             | +2 defense                    | 10 Gold |
| Steel Armor        | +3 defense                    | 20 Gold |
| Mythril Armor      | +4 defense                    | 35 Gold |
| Dragon Scale Armor | +6 defense                    | 60 Gold |
| Agility Garb       | +2 defense, +5% quest success | 30 Gold |
| Battle Plating     | +3 defense, +1 attack         | 28 Gold |
----------------------------------------------------------------

High-Tier Armor
----------------------------------------------------------------
| Item              | Effect                        |    Value |
| ----------------- | ----------------------------- | -------: |
| Celestial Plate   | +8 defense, +5% quest success |  85 Gold |
| Void Guardian     | +10 defense                   | 100 Gold |
| Equilibrium Shell | +3 attack, +6 defense         |  95 Gold |
----------------------------------------------------------------

ACCESSORIES

| Item             | Effect                    |   Value |
| ---------------- | ------------------------- | ------: |
| Lucky Amulet     | +10% quest success chance | 15 Gold |
| Hero Medallion   | +15% quest success chance | 30 Gold |
| Warrior’s Band   | +1 attack, +1 defense     | 25 Gold |
| Dragon’s Eye     | +20% quest success chance | 45 Gold |
| Charm of Balance | +2 attack, +2 defense     | 40 Gold |
| Scholar’s Ring   | +20% XP gain from quests  | 40 Gold |

High-Tier Accessories
| Item                  | Effect                                    |    Value |
| --------------------- | ----------------------------------------- | -------: |
| Celestial Emblem      | +30% quest success chance                 |  80 Gold |
| Legendary Catalyst    | +35% XP gain from quests                  |  75 Gold |
| Grand Totem           | +3 attack, +3 defense, +10% quest success |  90 Gold |
| Relic of the Ancients | +4 attack, +4 defense, +15% XP gain       | 110 Gold |

CONSUMABLES
| Item                  | Effect                                     	|   Value  |
| --------------------- | ---------------------------------------------	| ------:  |
| Health Potion         | Heal 5 HP                                  	|  5 Gold  |
| Bandage               | Quick heal 2 HP                            	|  3 Gold  |
| Greater Health Potion | Heal 10 HP                                 	|  8 Gold  |
| Elixir of Restoration | Full heal                                  	| 25 Gold  |
| Combat Scroll         | Temporary +2 attack next quest             	| 10 Gold  |
| Damage Charm          | Deal 3 damage to enemies                      | 8 Gold   |
| Time Scroll           | Resets quest cooldown                      	| 15 Gold  |
| Enhancement Stone     | +5% permanent quest success (one-time use) 	| 40 Gold  |
| Tome of Knowledge     | Gain 500 XP                                   | 50 Gold  |
| Combat Catalyst       | Temporary +4 attack next quest                | 25 Gold  |
| Ancient Wisdom        | Gain 1500 XP                                  | 100 Gold |
| Scroll of Enhancement | +7% permanent quest success (one-time use)    | 200 Gold |


RESET CHARACTER (permadeath) 
-------------------------------------------
Cursed Milk | WARNING: Permanently deletes character! | 42069 Gold |
-------------------------------------------

How to Buy:
[bot keyword] rpg shop [item]
[bot keyword] rpg buy  [item]
Examples:
[bot keyword] rpg buy enchanted blade
[bot keyword] rpg shop dragon slayer

How to Use:
[bot keyword] rpg use [item] 

Examples: 
[bot keyword] rpg use combat scroll
[bot keyword] rpg use elixir`

const shopLink = await turnIntoPasteDynuLink(shopItemsTxt)
// Shop interface function
function shopItems(userId, itemToBuy, checkGoldWallet, ensureCharacterExists) {
    ensureCharacterExists(userId);

    if (!itemToBuy) {
        return `check the shop: ${shopLink}`;
    }

    if (itemToBuy.toLowerCase().startsWith('sell ')) {
        return sellItem(userId, itemToBuy.substring(5), checkGoldWallet);
    }

    let itemId = null;
    let itemInfo = null;
    for (const [id, item] of Object.entries(ITEMS)) {
        // Skip items with 'treasure' in their ID
        if (id.toLowerCase().includes('treasure')) {
            continue;
        }
        if (item.name.toLowerCase().includes(itemToBuy.toLowerCase()) ||
            id.toLowerCase().includes(itemToBuy.toLowerCase())) {
            itemId = id;
            itemInfo = item;
            break;
        }
    }

    if (!itemId) {
        return `Item "${itemToBuy}" not found in shop. Try 'shop' to see available items.`;
    }

    // --- Enhancement Stone Purchase Limit Check ---
    if (itemId === 'enhancement stone') {
        const charStatus = db.prepare('SELECT has_used_enhancement_stone FROM characters WHERE userId = ?').get(userId);
        if (charStatus && charStatus.has_used_enhancement_stone) {
            return `You have already absorbed the power of an Enhancement Stone and cannot benefit from another.`;
        }
    }
    // --- End Enhancement Stone Check ---

    // Time Scroll purchase cooldown check
    if (itemId === 'time scroll') {
        const purchaseCheck = db.prepare(`
      SELECT purchaseDate
      FROM shop_purchases
      WHERE userId = ? AND itemId = ?
    `).get(userId, itemId);

        const now = new Date();
        const canBuy = !purchaseCheck || (new Date(purchaseCheck.purchaseDate) < new Date(now.setDate(now.getDate() - 1)));

        if (!canBuy) {
            const lastPurchase = new Date(purchaseCheck.purchaseDate);
            const nowAgain = new Date();
            const hoursSinceLast = (nowAgain - lastPurchase) / (1000 * 60 * 60);
            const remaining = Math.ceil(24 - hoursSinceLast);
            return `You can only buy Time Scrolls once per day. Come back in ${remaining} hours.`;
        }
    }

    // Check if user has enough gold
    const currentGold = checkGoldWallet(userId);
    if (currentGold < itemInfo.value) {
        return `You need ${itemInfo.value} gold to buy ${itemInfo.name} (you have ${currentGold}).`;
    }

    // Deduct gold
    const updateWallet = db.prepare('UPDATE wallets SET coinWallet = coinWallet - ? WHERE userId = ?');
    updateWallet.run(itemInfo.value, userId);

    // Add item to inventory
    giveItem(userId, itemId, 1);

    // Record purchase date for Time Scrolls
    if (itemId === 'time scroll') {
        db.prepare(`
      INSERT INTO shop_purchases (userId, itemId, purchaseDate)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(userId, itemId)
      DO UPDATE SET purchaseDate = datetime('now')
    `).run(userId, itemId);
    }

    return `You bought ${itemInfo.name} for ${itemInfo.value} gold! Use 'use ${itemId}' to use it.`;
}

// Function to sell items back to the shop
function sellItem(userId, itemToSell, checkGoldWallet) {
    if (!itemToSell) {
        return "Please specify what item you want to sell. Use 'shop sell [item name]'.";
    }

    // Find the item in inventory
    let itemId = null;

    for (const id of Object.keys(ITEMS)) {
        if (id.toLowerCase().includes(itemToSell.toLowerCase()) ||
            ITEMS[id].name.toLowerCase().includes(itemToSell.toLowerCase())) {
            // Check if user has this item
            const checkStmt = db.prepare('SELECT quantity FROM inventory WHERE userId = ? AND itemId = ?');
            const hasItem = checkStmt.get(userId, id);

            if (hasItem && hasItem.quantity > 0) {
                itemId = id;
                break;
            }
        }
    }

    if (!itemId) {
        return `You don't have an item matching "${itemToSell}" to sell. Type 'inv' to see your inventory.`;
    }

    const item = ITEMS[itemId];
    let sellValue;

    // Calculate sell value based on item type
    if (itemId.includes('treasure')) {
        sellValue = item.value; // Base shop value
    } else {
        // Regular items sell for 25% of purchase price
        sellValue = Math.floor(item.value * 0.25);
    }

    // Remove item from inventory
    removeItem(userId, itemId, 1);

    // Add gold to wallet
    const updateWallet = db.prepare('UPDATE wallets SET coinWallet = coinWallet + ? WHERE userId = ?');
    updateWallet.run(sellValue, userId);

    // Get updated gold amount
    const currentGold = checkGoldWallet(userId);

    let message = `You sold ${item.name} for ${sellValue} gold. (You now have ${currentGold} gold)`;

    return message;
}

export { shopItems };
