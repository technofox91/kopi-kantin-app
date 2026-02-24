// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'

export default function Home() {
  // --- AUTHENTICATION & ROLE STATE ---
  const [session, setSession] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

  // --- NAVIGATION & DATA STATE ---
  const [activeTab, setActiveTab] = useState('home')
  const [rawMaterials, setRawMaterials] = useState<any[]>([])
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [recipes, setRecipes] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([]) // NEW: Team State
  
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

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // --- INITIALIZATION & ROLE FETCHING ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchRole(session.user.id)
    })
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchRole(session.user.id)
      } else {
        setUserRole(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // NEW BOUNCER LOGIC: If profile is missing, kick them out
  const fetchRole = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('role').eq('id', userId).single()
    if (data) {
      setUserRole(data.role)
    } else {
      alert("ACCESS DENIED: Your account has been revoked by the Administrator.")
      handleLogout()
    }
  }

  useEffect(() => {
    if (session) {
      fetchData()
    }
  }, [session])

  const fetchData = async () => {
    const { data: rawData } = await supabase.from('raw_materials').select('*').order('name')
    const { data: menuData } = await supabase.from('menu_items').select('*').order('name')
    const { data: recipeData } = await supabase.from('recipes').select('id, menu_item_id, quantity_needed, raw_materials(name, unit)')
    const { data: teamData } = await supabase.from('profiles').select('*').order('role')
      
    if (rawData) {
      setRawMaterials(rawData)
      
      // Scan all ingredients and find the absolute most recent 'updated_at' time
      const latestTime = rawData.reduce((latest, item) => {
        const itemTime = new Date(item.updated_at || item.created_at || 0)
        return itemTime > latest ? itemTime : latest
      }, new Date(0))
      
      // Update the UI with the true last modified database time
      if (latestTime.getTime() > 0) {
        setLastUpdated(latestTime)
      }
    }
    
    if (menuData) setMenuItems(menuData)
    if (recipeData) setRecipes(recipeData)
    if (teamData) setTeamMembers(teamData)
  }

  // --- AUTH FUNCTIONS ---
  const handleAuth = async (e: any) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthMessage('')
    
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setAuthMessage(error.message)
      } else if (data.user) {
        // NEW: Save the email to the profile so the Admin can see it
        await supabase.from('profiles').insert({ id: data.user.id, role: 'staff', email: email })
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setAuthMessage('Invalid login credentials.')
    }
    setAuthLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setActiveTab('home') 
  }

  // --- CRUD FUNCTIONS ---
  // NEW: Revoke Staff Access
  const handleDeleteStaff = async (id: any) => {
    if (!window.confirm("Are you sure you want to revoke access for this user?")) return;
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (error) alert("Error: " + error.message)
    else fetchData()
  }

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
    const { error } = await supabase.from('raw_materials').insert({ name: rawName, unit: rawUnit, current_stock: parseFloat(rawStock || '0') })
    if (error) setRawMessage('Error: ' + error.message)
    else { setRawMessage(`Success!`); setRawName(''); setRawStock(''); fetchData() }
  }

  const handleRestock = async (e: any) => {
    e.preventDefault(); setRestockMessage('Updating...')
    if (!restockId || !restockAmount) return
    const item = rawMaterials.find((r: any) => r.id === restockId)
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

  const displayedRecipes = recipes.filter((r: any) => r.menu_item_id === viewMenuId)

  const inputClass = "w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none transition-all mb-4 appearance-none"
  const labelClass = "block mb-1.5 text-sm font-semibold text-slate-700"
  const cardClass = "bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col transition-all"
  const titleClass = "text-xl font-bold text-slate-900 mb-6"

  // ==========================================
  // VIEW 1: THE LOGIN SCREEN (If not logged in)
  // ==========================================
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 selection:bg-blue-200">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">
              Kopi Kantin <span className="text-blue-600">SIMS</span>
            </h1>
            <p className="text-slate-500 font-medium text-sm">Stock & Inventory Management System</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className={labelClass}>Email Address</label>
              <input type="email" placeholder="barista@kopikantin.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass + " !mb-0"} required />
            </div>
            <div>
              <label className={labelClass}>Password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass + " !mb-0"} required />
            </div>
            
            <button 
              type="submit" 
              disabled={authLoading} 
              className={`w-full text-white font-bold rounded-xl text-sm px-5 py-3.5 transition-colors shadow-sm disabled:opacity-70 mt-4 ${
              isSignUp ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
              >
              {authLoading ? 'Authenticating...' : (isSignUp ? 'Create Account' : 'Secure Login')}
            </button>
            
            {authMessage && (
              <p className={`text-sm text-center font-medium mt-3 ${authMessage.includes('Invalid') ? 'text-rose-600' : 'text-emerald-600'}`}>
                {authMessage}
              </p>
            )}
          </form>

          <div className="mt-8 text-center">
            <button onClick={() => {setIsSignUp(!isSignUp); setAuthMessage('');}} className="text-sm text-slate-500 hover:text-blue-600 font-semibold transition-colors">
              {isSignUp ? "Already have an account? Sign In" : "Need access? Create Account"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ==========================================
  // VIEW 2: THE DASHBOARD (If logged in)
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 md:pb-12 font-sans selection:bg-blue-200">
      
      {/* HEADER WITH LOGOUT */}
      <div className="bg-white border-b border-slate-200 pt-10 pb-6 px-6 mb-6 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 leading-none">
              Kopi Kantin <span className="text-blue-600">SIMS</span>
            </h1>
            <p className="text-slate-500 text-sm font-medium mt-1 flex items-center gap-2">
            Stock & Inventory Management 
            {userRole === 'admin' && <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider shadow-sm">Admin</span>}
            {userRole === 'staff' && <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider shadow-sm">Staff Barista</span>}
            </p>
        </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex space-x-2 bg-slate-100 p-1 rounded-lg">
              <button onClick={() => setActiveTab('home')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'home' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Dashboard</button>
              
              {userRole === 'admin' && (
                <>
                  <button onClick={() => setActiveTab('recipes')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'recipes' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Recipes</button>
                  <button onClick={() => setActiveTab('admin')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'admin' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Admin</button>
                </>
              )}
            </div>
            
            <button onClick={handleLogout} className="text-sm font-bold text-slate-400 hover:text-rose-600 transition-colors bg-slate-50 hover:bg-rose-50 px-3 py-2 rounded-lg">
              Log Out
            </button>
          </div>
        </div>
      </div>
      
      {/* MAIN CONTENT AREA */}
      <div className="max-w-3xl mx-auto px-6 space-y-6">
        
        {/* --- TAB 1: DASHBOARD --- */}
        <div className={activeTab === 'home' ? 'block' : 'hidden'}>
          <div className="space-y-6">
            <div className={`${cardClass} border-t-4 border-t-emerald-500`}>
              <h2 className={titleClass}>Friday Production Run</h2>
              <form onSubmit={handleProductionRun} className="flex-1 flex flex-col">
                <label className={labelClass}>Select Product to Brew</label>
                <select value={selectedMenuItem} onChange={(e: any) => setSelectedMenuItem(e.target.value)} className={inputClass}>
                  <option value="">-- Menu Item --</option>
                  {menuItems.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <label className={labelClass}>Total Bottles Produced</label>
                <input type="number" min="1" placeholder="e.g., 20" value={productionQuantity} onChange={(e: any) => setProductionQuantity(e.target.value)} className={inputClass} />
                <button type="submit" className="w-full text-white bg-emerald-600 hover:bg-emerald-700 font-bold rounded-lg text-sm px-5 py-3 mt-2 transition-colors shadow-sm">
                  Deduct Inventory Burn
                </button>
                {prodMessage && <p className={`mt-3 text-sm font-medium text-center ${prodMessage.includes('Error') ? 'text-rose-600' : 'text-emerald-600'}`}>{prodMessage}</p>}
              </form>
            </div>

            <div className={cardClass}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className={titleClass + " mb-0"}>Digital Pantry Stock</h2>
                  {lastUpdated && (
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    Updated: {lastUpdated.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute:'2-digit' })}
                  </p>
                  )}
                </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              </div>
              <ul className="divide-y divide-slate-100">
                {rawMaterials.length === 0 && <p className="text-sm text-slate-500 italic">Pantry is empty.</p>}
                {rawMaterials.map((item: any) => (
                  <li key={item.id} className="py-3 flex justify-between items-center group">
                    <span className="font-medium text-slate-800">{item.name}</span>
                    <span className="text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-lg">
                      {item.current_stock} <span className="text-slate-500 font-normal text-sm">{item.unit}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* --- TAB 2: RECIPES --- */}
        {userRole === 'admin' && (
          <div className={activeTab === 'recipes' ? 'block' : 'hidden'}>
            <div className="space-y-6">
              <div className={cardClass}>
                <h2 className={titleClass}>Recipe Engine</h2>
                <form onSubmit={handleSaveRecipeRule}>
                  <label className={labelClass}>Target Drink</label>
                  <select value={recipeMenuId} onChange={(e: any) => setRecipeMenuId(e.target.value)} className={inputClass}>
                    <option value="">-- Menu Item --</option>
                    {menuItems.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  <label className={labelClass}>Ingredient Needed</label>
                  <select value={recipeMaterialId} onChange={(e: any) => setRecipeMaterialId(e.target.value)} className={inputClass}>
                    <option value="">-- Raw Material --</option>
                    {rawMaterials.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  <label className={labelClass}>Amount (per 1 bottle)</label>
                  <input type="number" step="0.1" placeholder="e.g., 35" value={recipeQty} onChange={(e: any) => setRecipeQty(e.target.value)} className={inputClass} />
                  <button type="submit" className="w-full text-blue-600 bg-blue-50 border border-blue-200 font-bold rounded-lg text-sm px-5 py-3 mt-2">
                    + Map Ingredient
                  </button>
                </form>
                {builderMessage && <p className={`mt-3 text-sm font-medium text-center ${builderMessage.includes('Error') ? 'text-rose-600' : 'text-blue-600'}`}>{builderMessage}</p>}
              </div>

              <div className={cardClass}>
                <h2 className={titleClass}>Recipe BOM Viewer</h2>
                <select value={viewMenuId} onChange={(e: any) => setViewMenuId(e.target.value)} className={inputClass}>
                  <option value="">-- Select Drink to Inspect --</option>
                  {menuItems.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                {viewMenuId && (
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    {displayedRecipes.length === 0 && <p className="text-sm text-slate-500 italic">No ingredients mapped yet.</p>}
                    <ul className="space-y-3">
                      {displayedRecipes.map((rule: any) => (
                        <li key={rule.id} className="flex justify-between items-center text-sm">
                          <span className="text-slate-700">
                            <span className="font-bold text-slate-900">{rule.quantity_needed}</span> {rule.raw_materials?.unit} <span className="text-slate-600">{rule.raw_materials?.name}</span>
                          </span>
                          <button onClick={() => handleDeleteRule(rule.id)} className="text-slate-400 hover:text-rose-600 p-2">✕</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 3: ADMIN --- */}
        {userRole === 'admin' && (
          <div className={activeTab === 'admin' ? 'block' : 'hidden'}>
            <div className="space-y-6">
              
              {/* NEW: TEAM MANAGEMENT UI */}
              <div className={cardClass}>
                <h2 className={titleClass}>Team Management</h2>
                <div>
                   <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">Active Accounts</h3>
                   <ul className="divide-y divide-slate-100">
                    {teamMembers.map((member: any) => (
                      <li key={member.id} className="py-3 flex justify-between items-center">
                        <div>
                          <span className="text-sm font-medium text-slate-800 block">{member.email || 'Unknown User'}</span>
                          <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${member.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{member.role}</span>
                        </div>
                        {/* Protect the Admin from deleting themselves */}
                        {member.role !== 'admin' && (
                          <button onClick={() => handleDeleteStaff(member.id)} className="text-rose-500 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">Revoke Access</button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className={cardClass}>
                <h2 className={titleClass}>Inventory Admin</h2>
                <div className="mb-6 pb-6 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span> 
                    Log Delivery (Restock)
                  </h3>
                  <form onSubmit={handleRestock} className="flex gap-2">
                    <select value={restockId} onChange={(e: any) => setRestockId(e.target.value)} className={`${inputClass} !mb-0 w-3/5`} required>
                      <option value="">-- Select Item --</option>
                      {rawMaterials.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                    <input type="number" placeholder="+Qty" value={restockAmount} onChange={(e: any) => setRestockAmount(e.target.value)} className={`${inputClass} !mb-0 w-1/5`} required />
                    <button type="submit" className="bg-slate-800 hover:bg-slate-900 text-white rounded-lg px-2 text-sm font-bold w-1/5">Add</button>
                  </form>
                  {restockMessage && <p className="mt-2 text-xs font-medium text-emerald-600">{restockMessage}</p>}
                </div>

                <div className="mb-6 pb-6 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <span className="bg-purple-100 text-purple-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span> 
                    Create New Raw Material
                  </h3>
                  <form onSubmit={handleAddRawMaterial}>
                    <input type="text" placeholder="Ingredient Name" value={rawName} onChange={(e: any) => setRawName(e.target.value)} className={inputClass} required />
                    <div className="flex gap-2 mb-4">
                      <select value={rawUnit} onChange={(e: any) => setRawUnit(e.target.value)} className={`${inputClass} !mb-0 w-1/2`}>
                        <option value="grams">Grams (g)</option>
                        <option value="ml">Milliliters (ml)</option>
                        <option value="pieces">Pieces</option>
                      </select>
                      <input type="number" placeholder="Initial Stock" value={rawStock} onChange={(e: any) => setRawStock(e.target.value)} className={`${inputClass} !mb-0 w-1/2`} />
                    </div>
                    <button type="submit" className="w-full text-purple-700 bg-purple-50 font-bold rounded-lg text-sm px-5 py-3 mt-1">Save to Database</button>
                  </form>
                  {rawMessage && <p className="mt-2 text-xs font-medium text-emerald-600">{rawMessage}</p>}
                </div>

                <div>
                   <h3 className="text-sm font-bold text-rose-600 mb-3 flex items-center gap-2">Danger Zone: Delete Material</h3>
                   <ul className="divide-y divide-slate-100">
                    {rawMaterials.map((item: any) => (
                      <li key={item.id} className="py-2 flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-700">{item.name}</span>
                        <button onClick={() => handleDeleteRawMaterial(item.id)} className="text-rose-500 bg-rose-50 px-3 py-1 rounded text-xs font-bold">Delete</button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className={cardClass}>
                <h2 className={titleClass}>Menu Manager</h2>
                <div className="mb-6 pb-6 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800 mb-3">Add New Drink to Menu</h3>
                  <form onSubmit={handleAddMenuItem}>
                    <input type="text" placeholder="Drink Name" value={menuName} onChange={(e: any) => setMenuName(e.target.value)} className={inputClass} required />
                    <div className="flex gap-2">
                      <input type="text" placeholder="SKU (Optional)" value={menuSku} onChange={(e: any) => setMenuSku(e.target.value)} className={`${inputClass} !mb-0 w-2/3`} />
                      <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-2 text-sm font-bold w-1/3">Create</button>
                    </div>
                  </form>
                  {menuMessage && <p className="mt-2 text-xs font-medium text-emerald-600">{menuMessage}</p>}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-3">Active Menu (Tap to Delete)</h3>
                  <ul className="divide-y divide-slate-100">
                    {menuItems.map((item: any) => (
                      <li key={item.id} className="py-3 flex justify-between items-center">
                        <span className="font-semibold text-sm text-slate-700">{item.name}</span>
                        <button onClick={() => handleDeleteMenuItem(item.id)} className="text-slate-400 hover:text-rose-600 p-2">✕</button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* --- MOBILE BOTTOM NAVIGATION --- */}
      <div className="fixed bottom-0 left-0 z-50 w-full h-20 bg-white/90 backdrop-blur-md border-t border-slate-200 flex justify-around items-start pt-3 md:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.05)] pb-safe">
        
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center justify-center w-full space-y-1 transition-colors ${activeTab === 'home' ? 'text-blue-600' : 'text-slate-400'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          <span className="text-[10px] font-bold tracking-wide">Home</span>
        </button>

        {userRole === 'admin' && (
          <>
            <button onClick={() => setActiveTab('recipes')} className={`flex flex-col items-center justify-center w-full space-y-1 transition-colors ${activeTab === 'recipes' ? 'text-blue-600' : 'text-slate-400'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              <span className="text-[10px] font-bold tracking-wide">Recipes</span>
            </button>

            <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center justify-center w-full space-y-1 transition-colors ${activeTab === 'admin' ? 'text-blue-600' : 'text-slate-400'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <span className="text-[10px] font-bold tracking-wide">Admin</span>
            </button>
          </>
        )}

      </div>
    </div>
  )
}