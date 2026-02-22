'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'

export default function Home() {
  const [rawMaterials, setRawMaterials] = useState<any[]>([])
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [recipes, setRecipes] = useState<any[]>([])
  
  // States
  const [recipeMenuId, setRecipeMenuId] = useState('')
  const [recipeMaterialId, setRecipeMaterialId] = useState('')
  const [recipeQty, setRecipeQty] = useState('')
  const [builderMessage, setBuilderMessage] = useState('')

  const [selectedMenuItem, setSelectedMenuItem] = useState('')
  const [productionQuantity, setProductionQuantity] = useState(1)
  const [prodMessage, setProdMessage] = useState('')

  const [viewMenuId, setViewMenuId] = useState('')

  const [rawName, setRawName] = useState('')
  const [rawUnit, setRawUnit] = useState('grams')
  const [rawStock, setRawStock] = useState('')
  const [rawMessage, setRawMessage] = useState('')

  const [restockId, setRestockId] = useState('')
  const [restockAmount, setRestockAmount] = useState('')
  const [restockMessage, setRestockMessage] = useState('')

  const [menuName, setMenuName] = useState('')
  const [menuSku, setMenuSku] = useState('')
  const [menuMessage, setMenuMessage] = useState('')

  const fetchData = async () => {
    const { data: rawData } = await supabase.from('raw_materials').select('*').order('name')
    const { data: menuData } = await supabase.from('menu_items').select('*').order('name')
    const { data: recipeData } = await supabase.from('recipes').select('id, menu_item_id, quantity_needed, raw_materials(name, unit)')
      
    if (rawData) setRawMaterials(rawData)
    if (menuData) setMenuItems(menuData)
    if (recipeData) setRecipes(recipeData)
  }

  useEffect(() => {
    fetchData()
  }, [])

  // --- CRUD FUNCTIONS (Untouched, purely functional) ---
  const handleSaveRecipeRule = async (e: any) => {
    e.preventDefault(); setBuilderMessage('Saving...')
    if (!recipeMenuId || !recipeMaterialId || !recipeQty) return
    const { error } = await supabase.from('recipes').insert({ menu_item_id: recipeMenuId, raw_material_id: recipeMaterialId, quantity_needed: parseFloat(recipeQty) })
    if (error) setBuilderMessage('Error: ' + error.message)
    else { setBuilderMessage('Success!'); setRecipeQty(''); fetchData() }
  }

  const handleDeleteRule = async (recipeId: any) => {
    const { error } = await supabase.from('recipes').delete().eq('id', recipeId)
    if (!error) fetchData()
    else alert("Error deleting: " + error.message)
  }

  const handleProductionRun = async (e: any) => {
    e.preventDefault(); setProdMessage('Brewing batch...')
    if (!selectedMenuItem || productionQuantity <= 0) return
    const { error } = await supabase.rpc('deduct_ingredients', { p_menu_item_id: selectedMenuItem, p_quantity: productionQuantity.toString() })
    if (error) setProdMessage('Error: ' + error.message)
    else { setProdMessage(`Success! Deducted ingredients.`); fetchData() }
  }

  const handleAddRawMaterial = async (e: any) => {
    e.preventDefault(); setRawMessage('Adding...')
    if (!rawName || !rawUnit) return
    const { error } = await supabase.from('raw_materials').insert({ name: rawName, unit: rawUnit, current_stock: parseFloat(rawStock || 0) })
    if (error) setRawMessage('Error: ' + error.message)
    else { setRawMessage(`Success!`); setRawName(''); setRawStock(''); fetchData() }
  }

  const handleRestock = async (e: any) => {
    e.preventDefault(); setRestockMessage('Updating...')
    if (!restockId || !restockAmount) return
    const item = rawMaterials.find(r => r.id === restockId)
    const newStock = parseFloat(item.current_stock) + parseFloat(restockAmount)
    const { error } = await supabase.from('raw_materials').update({ current_stock: newStock }).eq('id', restockId)
    if (error) setRestockMessage('Error: ' + error.message)
    else { setRestockMessage(`Success!`); setRestockId(''); setRestockAmount(''); fetchData() }
  }

  const handleDeleteRawMaterial = async (id: any) => {
    if (!window.confirm("Are you sure you want to delete this ingredient?")) return;
    const { error } = await supabase.from('raw_materials').delete().eq('id', id)
    if (error) {
      if (error.code === '23503') alert("SAFETY BLOCK: Cannot delete this item because it is used in a Recipe!")
      else alert("Error deleting: " + error.message)
    } else fetchData()
  }

  const handleAddMenuItem = async (e: any) => {
    e.preventDefault(); setMenuMessage('Adding...')
    if (!menuName) return
    const { error } = await supabase.from('menu_items').insert({ name: menuName, sku: menuSku })
    if (error) setMenuMessage('Error: ' + error.message)
    else { setMenuMessage(`Success!`); setMenuName(''); setMenuSku(''); fetchData() }
  }

  const handleDeleteMenuItem = async (id: any) => {
    if (!window.confirm("Delete this menu item? Its recipe rules will also be deleted automatically.")) return;
    const { error } = await supabase.from('menu_items').delete().eq('id', id)
    if (error) alert("Error deleting: " + error.message)
    else fetchData()
  }

  const displayedRecipes = recipes.filter(r => r.menu_item_id === viewMenuId)

  // --- TAILWIND REUSABLE CLASSES ---
  const inputClass = "w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none transition-all mb-4"
  const labelClass = "block mb-1.5 text-sm font-semibold text-slate-700"
  const cardClass = "bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 flex flex-col transition-all hover:shadow-md"
  const titleClass = "text-xl font-bold text-slate-900 mb-6"

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-12 font-sans selection:bg-blue-200">
      
      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
          Kopi Kantin <span className="text-blue-600">HQ</span>
        </h1>
        <p className="text-slate-500 font-medium">Production & Inventory Operating System</p>
      </div>
      
      {/* MAIN GRID */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        
        {/* --- SECTION 1: DIGITAL PANTRY --- */}
        <div className={`${cardClass} lg:col-span-2`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className={titleClass + " mb-0"}>Digital Pantry Stock</h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">Live Database</span>
          </div>
          
          <div className="overflow-y-auto max-h-64 pr-2 custom-scrollbar">
            {rawMaterials.length === 0 && <p className="text-sm text-slate-500 italic">Pantry is empty.</p>}
            <ul className="divide-y divide-slate-100">
              {rawMaterials.map((item) => (
                <li key={item.id} className="py-3 flex justify-between items-center group">
                  <span className="font-medium text-slate-800">{item.name}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-lg">
                      {item.current_stock} <span className="text-slate-500 font-normal text-sm">{item.unit}</span>
                    </span>
                    <button 
                      onClick={() => handleDeleteRawMaterial(item.id)} 
                      className="text-slate-300 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete Item"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* --- SECTION 2: PRODUCTION RUN --- */}
        <div className={cardClass + " border-t-4 border-t-emerald-500"}>
          <h2 className={titleClass}>Friday Production Run</h2>
          <form onSubmit={handleProductionRun} className="flex-1 flex flex-col">
            <div>
              <label className={labelClass}>Select Product to Brew</label>
              <select value={selectedMenuItem} onChange={(e) => setSelectedMenuItem(e.target.value)} className={inputClass}>
                <option value="">-- Menu Item --</option>
                {menuItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Total Bottles Produced</label>
              <input type="number" min="1" placeholder="e.g., 20" value={productionQuantity} onChange={(e) => setProductionQuantity(e.target.value)} className={inputClass} />
            </div>
            <div className="mt-auto pt-4">
              <button type="submit" className="w-full text-white bg-emerald-600 hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-300 font-bold rounded-lg text-sm px-5 py-3 text-center transition-colors shadow-sm">
                Deduct Inventory Burn
              </button>
              {prodMessage && <p className={`mt-3 text-sm font-medium ${prodMessage.includes('Error') ? 'text-rose-600' : 'text-emerald-600'}`}>{prodMessage}</p>}
            </div>
          </form>
        </div>

        {/* --- SECTION 3: RECIPE BUILDER --- */}
        <div className={cardClass}>
          <h2 className={titleClass}>Recipe Engine</h2>
          <form onSubmit={handleSaveRecipeRule}>
            <label className={labelClass}>Target Drink</label>
            <select value={recipeMenuId} onChange={(e) => setRecipeMenuId(e.target.value)} className={inputClass}>
              <option value="">-- Menu Item --</option>
              {menuItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            
            <label className={labelClass}>Ingredient Needed</label>
            <select value={recipeMaterialId} onChange={(e) => setRecipeMaterialId(e.target.value)} className={inputClass}>
              <option value="">-- Raw Material --</option>
              {rawMaterials.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            
            <label className={labelClass}>Amount (per 1 bottle)</label>
            <input type="number" step="0.1" placeholder="e.g., 35" value={recipeQty} onChange={(e) => setRecipeQty(e.target.value)} className={inputClass} />
            
            <button type="submit" className="w-full text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-600 hover:text-white focus:ring-4 focus:ring-blue-100 font-bold rounded-lg text-sm px-5 py-2.5 text-center transition-all">
              + Map Ingredient
            </button>
          </form>
          {builderMessage && <p className={`mt-3 text-sm font-medium ${builderMessage.includes('Error') ? 'text-rose-600' : 'text-blue-600'}`}>{builderMessage}</p>}
        </div>

        {/* --- SECTION 4: RECIPE VIEWER --- */}
        <div className={cardClass}>
          <h2 className={titleClass}>Recipe BOM Viewer</h2>
          <label className={labelClass}>Inspect Recipe</label>
          <select value={viewMenuId} onChange={(e) => setViewMenuId(e.target.value)} className={inputClass}>
            <option value="">-- Select Drink --</option>
            {menuItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          
          {viewMenuId && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex-1">
              {displayedRecipes.length === 0 && <p className="text-sm text-slate-500 italic">No ingredients mapped yet.</p>}
              <ul className="space-y-3">
                {displayedRecipes.map((rule: any) => (
                  <li key={rule.id} className="flex justify-between items-center text-sm">
                    <span className="text-slate-700">
                      <span className="font-bold text-slate-900">{rule.quantity_needed}</span> {rule.raw_materials?.unit} <span className="text-slate-600">{rule.raw_materials?.name}</span>
                    </span>
                    <button onClick={() => handleDeleteRule(rule.id)} className="text-slate-400 hover:text-rose-600 transition-colors" title="Unlink Ingredient">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* --- SECTION 5: RESTOCKING & INVENTORY ADMIN --- */}
        <div className={cardClass}>
          <h2 className={titleClass}>Inventory Admin</h2>
          
          <div className="mb-6 pb-6 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span> 
              Log Delivery (Restock)
            </h3>
            <form onSubmit={handleRestock} className="flex gap-2">
              <select value={restockId} onChange={(e) => setRestockId(e.target.value)} className={`${inputClass} !mb-0 flex-1`}>
                <option value="">-- Select Item --</option>
                {rawMaterials.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <input type="number" placeholder="+Qty" value={restockAmount} onChange={(e) => setRestockAmount(e.target.value)} className={`${inputClass} !mb-0 w-24`} required />
              <button type="submit" className="bg-slate-800 hover:bg-slate-900 text-white rounded-lg px-4 text-sm font-bold transition-colors">Add</button>
            </form>
            {restockMessage && <p className={`mt-2 text-xs font-medium ${restockMessage.includes('Error') ? 'text-rose-600' : 'text-emerald-600'}`}>{restockMessage}</p>}
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span className="bg-purple-100 text-purple-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span> 
              Create New Raw Material
            </h3>
            <form onSubmit={handleAddRawMaterial}>
              <input type="text" placeholder="Ingredient Name (e.g., Brown Sugar)" value={rawName} onChange={(e) => setRawName(e.target.value)} className={inputClass} required />
              <div className="flex gap-2 mb-4">
                <select value={rawUnit} onChange={(e) => setRawUnit(e.target.value)} className={`${inputClass} !mb-0 flex-1`}>
                  <option value="grams">Grams (g)</option>
                  <option value="ml">Milliliters (ml)</option>
                  <option value="pieces">Pieces</option>
                </select>
                <input type="number" placeholder="Initial Stock" value={rawStock} onChange={(e) => setRawStock(e.target.value)} className={`${inputClass} !mb-0 flex-1`} />
              </div>
              <button type="submit" className="w-full text-purple-700 bg-purple-50 hover:bg-purple-100 font-bold rounded-lg text-sm px-5 py-2.5 text-center transition-colors">
                Save to Database
              </button>
            </form>
            {rawMessage && <p className={`mt-2 text-xs font-medium ${rawMessage.includes('Error') ? 'text-rose-600' : 'text-emerald-600'}`}>{rawMessage}</p>}
          </div>
        </div>

        {/* --- SECTION 6: MENU MANAGEMENT --- */}
        <div className={cardClass}>
          <h2 className={titleClass}>Menu Manager</h2>
          
          <div className="mb-6 pb-6 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Add New Drink to Menu</h3>
            <form onSubmit={handleAddMenuItem}>
              <input type="text" placeholder="Drink Name (e.g., Vanilla Latte)" value={menuName} onChange={(e) => setMenuName(e.target.value)} className={inputClass} required />
              <div className="flex gap-2 mb-4">
                <input type="text" placeholder="SKU (Optional)" value={menuSku} onChange={(e) => setMenuSku(e.target.value)} className={`${inputClass} !mb-0 flex-1`} />
                <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-4 text-sm font-bold transition-colors">Create</button>
              </div>
            </form>
            {menuMessage && <p className={`mt-2 text-xs font-medium ${menuMessage.includes('Error') ? 'text-rose-600' : 'text-emerald-600'}`}>{menuMessage}</p>}
          </div>

          <div className="flex-1 flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Current Active Menu</h3>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex-1 overflow-y-auto max-h-40 custom-scrollbar">
              {menuItems.length === 0 && <p className="text-sm text-slate-500 italic">Menu is empty.</p>}
              <ul className="space-y-3">
                {menuItems.map((item: any) => (
                  <li key={item.id} className="flex justify-between items-center text-sm group">
                    <span className="font-semibold text-slate-700">{item.name}</span>
                    <button onClick={() => handleDeleteMenuItem(item.id)} className="text-slate-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100" title="Delete Menu Item">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}