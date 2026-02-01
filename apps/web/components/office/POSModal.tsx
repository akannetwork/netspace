'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { UserIcon } from '@heroicons/react/24/outline';
import { Modal } from '@/components/ui/Modal';
import { useBranch } from '@/context/branch-context';
import { useQueryClient } from '@tanstack/react-query';
import { financeService, FinanceAccount } from '@/lib/services/finance.service';
import { toast } from 'sonner';

// Types
interface Product {
    id: string;
    name: string;
    price: number;
    sku: string;
    barcode?: string;
    stock: number; // Current stock in branch
    image_url?: string;
    track_stock?: boolean;
    total_stock?: number; // Total stock across all branches
}

interface CartItem extends Product {
    qty: number;
}

interface POSModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function POSModal({ isOpen, onClose }: POSModalProps) {
    const { currentBranch } = useBranch();
    const queryClient = useQueryClient();

    // Wizard State
    const [step, setStep] = useState<1 | 2 | 3>(1);

    // Data State
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
    const [customers, setCustomers] = useState<any[]>([]); // Search results

    // UI State
    const [searchQuery, setSearchQuery] = useState(''); // Product Search
    const [customerSearch, setCustomerSearch] = useState(''); // Customer Search
    const [cart, setCart] = useState<CartItem[]>([]);
    const [customer, setCustomer] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Payment State
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit_card' | 'eft' | 'check' | 'credit' | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<string>('');

    // Advanced Payment State
    const [checkDetails, setCheckDetails] = useState({ bank: '', due_date: '', amount: 0 });
    const [creditDetails, setCreditDetails] = useState({ due_date: '', installments: 1, downPayment: 0, interestRate: 2.5 });

    const [note, setNote] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);
    const customerInputRef = useRef<HTMLInputElement>(null);

    // Initial Load & Reset
    useEffect(() => {
        if (isOpen) {
            loadData();
            // Reset Wizard
            setStep(1);
            setCustomer(null);
            setCart([]);
            setPaymentMethod(null);
            setSelectedAccount('');
            setNote('');
            setCustomerSearch('');
            setSearchQuery('');
            setCheckDetails({ bank: '', due_date: '', amount: 0 });
            setCreditDetails({ due_date: '', installments: 1, downPayment: 0, interestRate: 2.5 });
            // Focus Customer Input
            setTimeout(() => customerInputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Update Check Amount when total changes


    // Step 1: Customer Search Debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (step === 1 && customerSearch.length >= 2) {
                // Fetch Customers
                searchContact(customerSearch);
            } else if (step === 1 && customerSearch.length === 0) {
                setCustomers([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [customerSearch, step]);

    // Product Search Filter (Step 2)
    useEffect(() => {
        if (!searchQuery) {
            setFilteredProducts([]);
        } else {
            const lower = searchQuery.toLowerCase();
            // Exact Barcode Match?
            const exactBarcode = products.find(p => p.barcode === searchQuery);
            if (exactBarcode) {
                addToCart(exactBarcode);
                setSearchQuery('');
                setTimeout(() => searchInputRef.current?.focus(), 50);
                return;
            }

            setFilteredProducts(products.filter(p =>
                p.name.toLowerCase().includes(lower) ||
                p.sku.toLowerCase().includes(lower) ||
                (p.barcode && p.barcode.includes(lower))
            ));
        }
    }, [searchQuery, products]);

    async function loadData() {
        try {
            const [prodRes, accRes] = await Promise.all([
                api.get(`/office/products?limit=500&branch_id=${currentBranch?.id || ''}`),
                financeService.getAccounts()
            ]);
            const productList = Array.isArray(prodRes.data) ? prodRes.data : (prodRes.data?.data || []);
            setProducts(productList);
            setAccounts(accRes);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load POS data');
        }
    }

    async function searchContact(q: string) {
        try {
            // Assuming existing contact/search endpoint or filters
            // Since /office/contacts returns paginated data, we check if it supports search query
            const res = await api.get(`/office/contacts?search=${q}&limit=5`);
            setCustomers(res.data?.data || []);
        } catch (err) {
            console.error(err);
        }
    }

    // Step Actions
    function handleCustomerSelect(c: any) {
        setCustomer(c);
        setStep(2);
        // Focus Product Search next tick
        setTimeout(() => searchInputRef.current?.focus(), 100);
    }

    // Cart Actions
    function addToCart(product: Product) {
        // Stock Check logic...
        const currentQty = cart.find(i => i.id === product.id)?.qty || 0;

        // Robust Stock Handling:
        // 1. Prefer 'stock' (new backend). 
        // 2. Fallback to 'quantity' (old backend compatibility).
        // 3. If neither, assume 0.
        // @ts-ignore
        const availableStock = product.stock ?? product.quantity ?? 0;
        const tracked = product.track_stock ?? true;

        // If tracked is false, we ignore stock.
        // If tracked is true, we must have stock > currentQty.
        if (tracked) {
            if (availableStock <= 0) {
                toast.error('Stokta ürün yok!');
                return;
            }
            if (currentQty + 1 > availableStock) {
                toast.error(`Stok yetersiz! Sadece ${availableStock} adet var.`);
                return;
            }
        }

        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
            }
            return [...prev, { ...product, qty: 1 }];
        });
        toast.success(`Ek lendi: ${product.name}`);
        setSearchQuery('');
        setTimeout(() => searchInputRef.current?.focus(), 50);
    }

    function updateQty(productId: string, delta: number) {
        setCart(prev => prev.map(item => {
            if (item.id === productId) {
                const newQty = Math.max(1, item.qty + delta);
                if (item.track_stock !== false && newQty > item.stock) {
                    toast.error('Maksimum stok');
                    return item;
                }
                return { ...item, qty: newQty };
            }
            return item;
        }).filter(item => item.qty > 0));
    }

    function removeFromCart(id: string) {
        setCart(prev => prev.filter(i => i.id !== id));
    }

    // Totals
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    // const tax = 0; // Tax is now inclusive or 0 for now as requested.


    // Advanced Credit Logic
    // 1. Calculate Remaining Principal (Total - DownPayment)
    const remainingPrincipal = Math.max(0, subtotal - creditDetails.downPayment);

    // 2. Calculate Interest on Remaining Principal
    // Formula: Remaining * (Rate/100 * Installments)
    // Only applies if installments > 1
    const installmentInterest = (paymentMethod === 'credit' && creditDetails.installments > 1)
        ? (remainingPrincipal) * ((creditDetails.interestRate || 0) / 100 * creditDetails.installments)
        : 0;

    // 3. Total Amount owed by customer = Subtotal + Interest
    // Note: Down Payment is already paid, so debt is (Subtotal - DownPayment + Interest) ? 
    // Wait. Total Order Value is: Subtotal + Interest.
    // Customer pays DownPayment NOW.
    // Customer owes (Total - DownPayment).

    // Let's define "Total" as the Invoice Amount.
    const total = subtotal + installmentInterest;
    // Previous code: price * qty is subtotal. Let's keep simpler logic for now matching user expectation "Topla"
    // Actually user UI shows "Toplam 106.000". I will use `total` variable.

    // Update Check Amount when total changes (Only if Check is selected)
    useEffect(() => {
        if (paymentMethod === 'check') {
            setCheckDetails(prev => ({ ...prev, amount: total }));
        }
    }, [total, paymentMethod]);

    // Reset Credit Details when not Credit
    useEffect(() => {
        if (paymentMethod !== 'credit') {
            setCreditDetails({ due_date: '', installments: 1, downPayment: 0, interestRate: 2.5 });
        }
    }, [paymentMethod]);

    // Checkout
    async function handleCheckout(status: 'delivered' | 'pending' | 'new') {
        if (!paymentMethod) return toast.error('Ödeme Yöntemi seçiniz');

        // Validation
        if (paymentMethod === 'check') {
            if (!checkDetails.bank || !checkDetails.due_date || checkDetails.amount <= 0) {
                return toast.error('Lütfen çek bilgilerini eksiksiz giriniz');
            }
        } else if (paymentMethod === 'credit') {
            if (!creditDetails.due_date) {
                return toast.error('Lütfen vade tarihi giriniz');
            }
        } else {
            if (!selectedAccount) {
                return toast.error('Hesap (Kasa/Banka) seçiniz');
            }
        }

        try {
            setLoading(true);
            const payload = {
                customer_id: customer.id,
                customer: {
                    id: customer.id, // Added customer ID to the nested customer object
                    name: customer.name,
                    email: customer.email || 'pos@client.com',
                    phone: customer.phone,
                },
                branch_id: currentBranch?.id,
                items: cart.map(i => ({ product_id: i.id, quantity: i.qty })),
                channel: 'store',
                note: note
            };

            // 1. Create Order
            const paymentStatus = (paymentMethod === 'cash' || paymentMethod === 'credit_card' || paymentMethod === 'check') ? 'paid' : 'pending';
            const { data: order } = await api.post('/office/orders', {
                ...payload,
                status,
                payment_status: paymentStatus,
                payment_method: paymentMethod
            });

            // 2. Financials

            // A. Debit Customer (Borçlandır) - Always for the full Order Amount
            await api.post('/office/contacts/transactions', {
                contact_id: customer.id,
                type: 'debit',
                amount: total,
                category: 'sale',
                description: `Sipariş #${order.order_number}`,
                order_id: order.id
            });

            // B. Handle Payments
            if (paymentMethod === 'check') {
                // Check: Just store the check. Order Status remains 'pending'.
                const checkData = {
                    amount: checkDetails.amount,
                    bank_name: checkDetails.bank,
                    due_date: checkDetails.due_date,
                    status: 'pending',
                    contact_id: customer.id,
                    description: `Sipariş #${order.order_number} ödemesi`,
                    order_id: order.id,
                    direction: 'in' // Customer giving us a check
                };
                await api.post('/office/finance/checks', checkData);

            } else if (paymentMethod === 'eft') {
                // EFT: Debit Only (Done). No collection yet.
                await api.put(`/office/orders/${order.id}`, {
                    note: `${note}\n\nÖdeme Bekliyor: EFT/Havale`
                });

            } else if (paymentMethod === 'credit') {
                // Cari: Debit Only (Done).

                // 1. Down Payment Handling
                if (creditDetails.downPayment > 0) {
                    await api.post('/office/contacts/transactions', {
                        contact_id: customer.id,
                        type: 'credit', // Credit Customer (Collection)
                        amount: creditDetails.downPayment,
                        category: 'collection',
                        description: `Peşinat (Sipariş #${order.order_number})`,
                        order_id: order.id
                    });

                    if (selectedAccount) {
                        await financeService.createTransaction({
                            account_id: selectedAccount,
                            type: 'income',
                            amount: creditDetails.downPayment,
                            description: `Hızlı Satış Peşinat #${order.order_number}`,
                            contact_id: customer.id,
                            order_id: order.id
                        });
                    }
                }

                // 2. Generate Installments (Real DB Records)
                if (creditDetails.installments > 1) {
                    const remainingDebt = total - creditDetails.downPayment;
                    const installmentAmount = remainingDebt / creditDetails.installments;
                    const newInstallments = [];
                    const startDate = new Date(creditDetails.due_date || new Date());

                    for (let i = 0; i < creditDetails.installments; i++) {
                        const date = new Date(startDate);
                        date.setMonth(date.getMonth() + i);

                        newInstallments.push({
                            contact_id: customer.id,
                            order_id: order.id,
                            type: 'receivable',
                            amount: installmentAmount,
                            remaining_amount: installmentAmount,
                            due_date: date.toISOString().split('T')[0],
                            status: 'pending'
                        });
                    }
                    await api.post('/office/finance/installments', newInstallments);
                }

                await api.put(`/office/orders/${order.id}`, {
                    note: `${note}\n\nÖdeme Planı:\n` +
                        `- Toplam: ${formatCurrency(total)}\n` +
                        `- Peşinat: ${formatCurrency(creditDetails.downPayment)}\n` +
                        `- Kalan Borç: ${formatCurrency(total - creditDetails.downPayment)}\n` +
                        `- Taksit: ${creditDetails.installments} x ${formatCurrency((total - creditDetails.downPayment) / creditDetails.installments)}\n` +
                        `- Vade Başlangıç: ${creditDetails.due_date}`
                });

            } else {
                // Cash / Credit Card
                // Credits the customer immediately.
                await api.post('/office/contacts/transactions', {
                    contact_id: customer.id,
                    type: 'credit',
                    amount: total,
                    category: 'collection',
                    description: `Ödeme (${paymentMethod === 'credit_card' ? 'Kredi Kartı' : 'Nakit'})`,
                    order_id: order.id
                });

                if (selectedAccount) {
                    await financeService.createTransaction({
                        account_id: selectedAccount,
                        type: 'income',
                        amount: total,
                        description: `Hızlı Satış #${order.order_number}`,
                        contact_id: customer.id,
                        order_id: order.id
                    });
                }
            }

            toast.success('Sipariş Oluşturuldu!');
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            onClose();

        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Hata oluştu');
        } finally {
            setLoading(false);
        }
    }



    const filteredAccounts = (accounts || []).filter(a => {
        if (paymentMethod === 'cash') return a.type === 'cash';
        if (paymentMethod === 'credit_card') return a.type === 'pos';
        if (paymentMethod === 'eft') return a.type === 'bank';
        return true;
    });


    return (
        <Modal isOpen={isOpen} onClose={onClose} size="full" noPadding title={"Hızlı Satış"} footer={null}>
            <div className="flex flex-col space-y-4 max-w-4xl mx-auto w-full p-4 pb-20">
                {/* ---------- STEP 1: CUSTOMER ---------- */}
                {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-4">
                        <h2 className="text-lg font-bold text-center">Müşteri Seçimi</h2>
                        <div>
                            <input
                                ref={customerInputRef}
                                type="text"
                                placeholder="Müşteri Ara [ Ad Soyad veya Telefon ]"
                                value={customerSearch}
                                onChange={e => setCustomerSearch(e.target.value)}
                                className="w-full text-lg p-3 border-2 border-indigo-100 rounded-xl focus:border-indigo-500 outline-none"
                            />
                        </div>

                        {/* Results */}
                        <div className='flex flex-col space-y-2'>
                            {customers.map(c => (
                                <div key={c.id} onClick={() => handleCustomerSelect(c)} className="listItem cursor-pointer flex items-center justify-between hover:bg-indigo-50 hover:border-indigo-300">
                                    <span className="flex flex-col">
                                        <span className='font-bold text-lg'>{c.name}</span>
                                        <span className="text-sm text-gray-500">{c.phone || c.email}</span>
                                    </span>
                                    <span className={`text-right font-bold ${(c.balance || 0) < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                        <div className="font-bold">{formatCurrency(c.balance || 0)}</div>
                                        <div className="text-[10px] font-bold mt-0.5 uppercase">
                                            {(c.balance || 0) < 0 ? '[ALACAKLI]' : ((c.balance || 0) > 0 ? '[BORÇLU]' : '-')}
                                        </div>
                                    </span>
                                </div>
                            ))}
                            {customerSearch && customers.length === 0 && (
                                <div className="text-center text-gray-400 py-4">Müşteri bulunamadı</div>
                            )}
                        </div>
                    </div>
                )}

                {/* ---------- STEP 2: PRODUCT & CART ---------- */}
                {step === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-8 duration-300 space-y-4">
                        {/* Selected Customer Header */}
                        <div className="flex items-center justify-between bg-indigo-50 p-3 rounded-lg border border-indigo-100 mb-2">
                            <div className="flex items-center gap-2">
                                <UserIcon className="w-5 h-5 text-indigo-600" />
                                <span className="font-bold">{customer?.name}</span>
                            </div>
                            <button onClick={() => setStep(1)} className="text-xs text-indigo-600 hover:underline">Değiştir</button>
                        </div>

                        {/* Search */}
                        <div>
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Ürün Ara [ Ürün Adı veya Barkod ]"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                            />
                        </div>

                        {/* Search Results */}
                        {filteredProducts.length > 0 && (
                            <div className='flex flex-col space-y-2 max-h-[300px] overflow-y-auto border rounded-xl p-2 bg-gray-50'>
                                {filteredProducts.slice(0, 20).map(p => (
                                    <div key={p.id} onClick={() => addToCart(p)} className="listItem cursor-pointer flex items-center justify-between bg-white">
                                        <span className="flex flex-col">
                                            <span className='font-bold'>{p.name}</span>
                                            <span className="text-xs text-gray-500">{p.sku}</span>
                                        </span>
                                        <div className="flex flex-col items-end">
                                            <span className={`tag-sm text-white ${p.stock > 0 ? 'bg-green-500' : 'bg-red-400'}`}>
                                                {p.track_stock === false ? 'INF' : `${p.stock} / ${p.total_stock || 0} Adet`}
                                            </span>
                                            <span className='text-right font-bold'>{formatCurrency(p.price)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Cart */}
                        <div className="mt-4">
                            <h3 className='text-center font-bold text-gray-500 mb-2'>Sepet ({cart.length})</h3>
                            <div className='itemGroup flex flex-col space-y-3 pb-24'>
                                {cart.map(item => (
                                    <div key={item.id} className="listItem flex flex-col space-y-2 bg-white border-l-4 border-l-indigo-500">
                                        <div className="flex justify-between items-center">
                                            <span className="flex flex-col">
                                                <span className='font-bold'>{item.name}</span>
                                                <span className='text-xs text-gray-400'>{formatCurrency(item.price)} x {item.qty}</span>
                                            </span>
                                            <div className="flex flex-col items-end">
                                                <span className='text-right font-bold text-lg'>{formatCurrency(item.price * item.qty)}</span>
                                            </div>
                                        </div>
                                        <div className='grid grid-cols-2 items-center pt-2 border-t border-gray-50'>
                                            <div className='flex items-center gap-1'>
                                                <button onClick={() => updateQty(item.id, -1)} className='button button-square w-8 h-8 font-bold text-lg'>-</button>
                                                <span className="w-10 text-center font-medium">{item.qty}</span>
                                                <button onClick={() => updateQty(item.id, 1)} className='button button-square w-8 h-8 font-bold text-lg'>+</button>
                                            </div>
                                            <div className='text-right'>
                                                <button onClick={() => removeFromCart(item.id)} className="text-red-500 text-sm hover:underline">Çıkar</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {cart.length === 0 && <div className="text-center text-gray-400 py-4 italic">Sepet boş</div>}

                                <button
                                    onClick={() => setStep(3)}
                                    disabled={cart.length === 0}
                                    className='button button-primary mt-4 py-4 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg'
                                >
                                    Ödemeye Geç
                                </button>
                            </div>
                        </div>
                    </div>
                )}


                {/* ---------- STEP 3: PAYMENT ---------- */}
                {step === 3 && (
                    <div className="animate-in fade-in slide-in-from-right-8 duration-300 space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <button onClick={() => setStep(2)} className="text-gray-500 hover:text-gray-800">&larr; Geri</button>
                        </div>

                        <div className="bg-indigo-900 text-white p-4 rounded-xl text-center mb-6 shadow-indigo-200 shadow-xl">
                            <div className="text-sm text-black opacity-80">Toplam Tutar</div>
                            <div className="text-3xl text-black font-bold">{formatCurrency(total || 0)}</div>
                            {paymentMethod === 'credit' && (
                                <div className="mt-4 pt-4 border-t text-black border-indigo-700 grid grid-cols-2 gap-2 text-sm">
                                    <div className="text-right text-indigo-200">Ara Toplam:</div>
                                    <div className="text-right font-medium text-black">{formatCurrency(subtotal)}</div>

                                    <div className="text-right text-indigo-200">Peşinat (-):</div>
                                    <div className="text-right font-medium text-black">{formatCurrency(creditDetails.downPayment)}</div>

                                    {creditDetails.installments > 1 && (
                                        <>
                                            <div className="text-right text-indigo-200">Vade Farkı (+):</div>
                                            <div className="text-right font-medium text-black">{formatCurrency(installmentInterest)}</div>
                                        </>
                                    )}

                                    <div className="text-right font-bold text-xl text-black mt-2 pt-2 border-t border-indigo-500">Kalan Borç:</div>
                                    <div className="text-right font-bold text-xl text-black mt-2 pt-2 border-t border-indigo-500">
                                        {formatCurrency(total - creditDetails.downPayment)}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Payment Methods */}
                        <div className="flex flex-col space-y-3">
                            <label className="text-sm font-bold text-gray-700">Ödeme Yöntemi</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => { setPaymentMethod('cash'); setSelectedAccount(''); }}
                                    className={`button h-12 font-medium ${paymentMethod === 'cash' ? 'button-primary border-indigo-600' : 'bg-white'}`}
                                >
                                    Nakit
                                </button>
                                <button
                                    onClick={() => { setPaymentMethod('credit_card'); setSelectedAccount(''); }}
                                    className={`button h-12 font-medium ${paymentMethod === 'credit_card' ? 'button-primary border-indigo-600' : 'bg-white'}`}
                                >
                                    Kredi Kartı
                                </button>
                                <button
                                    onClick={() => { setPaymentMethod('check'); }}
                                    className={`button h-12 font-medium ${paymentMethod === 'check' ? 'button-primary border-indigo-600' : 'bg-white'}`}
                                >
                                    Çek
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('credit')}
                                    className={`button h-12 font-medium ${paymentMethod === 'credit' ? 'button-primary border-indigo-600' : 'bg-white'}`}
                                >
                                    Veresiye / Cari
                                </button>
                            </div>
                        </div>

                        {/* CHECK DETAILS */}
                        {paymentMethod === 'check' && (
                            <div className="animate-in slide-in-from-top-2 duration-200 grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg border">
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Çek Tutarı</label>
                                    <input
                                        type="number"
                                        className="w-full font-bold text-lg"
                                        value={checkDetails.amount}
                                        onChange={e => setCheckDetails({ ...checkDetails, amount: Number(e.target.value) })}
                                    />
                                    {checkDetails.amount !== total && (
                                        <div className={`text-xs mt-1 font-bold ${checkDetails.amount > total ? 'text-green-600' : 'text-red-500'}`}>
                                            {checkDetails.amount > total
                                                ? `Müşteriye Alacak: ${formatCurrency(checkDetails.amount - total)}`
                                                : `Müşteriye Borç: ${formatCurrency(total - checkDetails.amount)}`
                                            }
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Banka Adı</label>
                                    <input
                                        type="text"
                                        placeholder="Garanti, Akbank vs."
                                        value={checkDetails.bank}
                                        onChange={e => setCheckDetails({ ...checkDetails, bank: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Vade Tarihi</label>
                                    <input
                                        type="date"
                                        value={checkDetails.due_date}
                                        onChange={e => setCheckDetails({ ...checkDetails, due_date: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}

                        {/* CREDIT DETAILS */}
                        {paymentMethod === 'credit' && (
                            <div className="animate-in slide-in-from-top-2 duration-200 bg-gray-50 rounded-lg border p-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-bold text-gray-700">Vade Tarihi</label>
                                        <input
                                            type="date"
                                            className="w-full p-3 border-2 border-gray-200 rounded-xl"
                                            value={creditDetails.due_date}
                                            onChange={e => setCreditDetails({ ...creditDetails, due_date: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-gray-700">Taksit Sayısı</label>
                                        <select
                                            className="w-full p-3 border-2 border-gray-200 rounded-xl"
                                            value={creditDetails.installments}
                                            onChange={e => setCreditDetails({ ...creditDetails, installments: Number(e.target.value) })}
                                        >
                                            {[1, 2, 3, 4, 5, 6, 9, 12].map(n => (
                                                <option key={n} value={n}>{n === 1 ? 'Tek Çekim / Peşin' : `${n} Taksit`}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-gray-700">Peşinat (Opsiyonel)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="0"
                                                className="w-full p-3 border-2 border-gray-200 rounded-xl"
                                                value={creditDetails.downPayment}
                                                onChange={e => setCreditDetails({ ...creditDetails, downPayment: Number(e.target.value) })}
                                            />
                                            <span className="absolute right-3 top-3 text-gray-400">TL</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-gray-700">Vade Farkı Oranı (%)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                className="w-full p-3 border-2 border-gray-200 rounded-xl"
                                                value={creditDetails.interestRate}
                                                onChange={e => setCreditDetails({ ...creditDetails, interestRate: Number(e.target.value) })}
                                                disabled={creditDetails.installments <= 1}
                                            />
                                            <span className="absolute right-3 top-3 text-gray-400">%</span>
                                        </div>
                                    </div>
                                </div>
                                {creditDetails.installments > 1 && (
                                    <div className="col-span-2 text-center text-sm font-medium text-indigo-600 bg-indigo-50 p-2 rounded">
                                        {formatCurrency(total / creditDetails.installments)} / Ay
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Dynamic Selectors */}
                        {(paymentMethod === 'cash' || paymentMethod === 'credit_card' || paymentMethod === 'eft') && (
                            <div className="animate-in slide-in-from-top-2 duration-200">
                                <label className="text-sm font-bold text-gray-700 block mb-1">Hesap Seçimi</label>
                                <select
                                    className="w-full p-3 border rounded-lg bg-white"
                                    value={selectedAccount}
                                    onChange={e => setSelectedAccount(e.target.value)}
                                >
                                    <option value="">-- Hesap Seçiniz --</option>
                                    {filteredAccounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="pt-2">
                            <textarea
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder="Sipariş Notu (Opsiyonel)"
                                className="w-full min-h-[80px]"
                            ></textarea>
                        </div>

                        <div className="flex gap-3 pt-6 pb-12">
                            <button
                                onClick={() => handleCheckout('new')}
                                disabled={loading}
                                className='button button-primary-outline w-full h-14 font-bold text-lg disabled:opacity-50'
                            >
                                {loading ? 'İşleniyor...' : 'Sipariş Oluştur'}
                            </button>
                            <button
                                onClick={() => handleCheckout('delivered')}
                                disabled={loading}
                                className='button button-primary w-full h-14 font-bold text-lg disabled:opacity-50'
                            >
                                {loading ? 'İşleniyor...' : 'Hemen Teslim'}
                            </button>
                        </div>

                    </div>
                )}
            </div>

            {/* Sticky Total Footer (Always Visible if Cart > 0) */}
            {step === 2 && cart.length > 0 && (
                <div className='absolute bottom-0 left-0 right-0 p-4 bg-white border-t items-center shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-10 md:hidden'>
                    <div className="flex justify-between items-center mb-2">
                        <span className='font-bold text-gray-500'>Toplam</span>
                        <span className='font-bold text-xl'>{formatCurrency(total)}</span>
                    </div>
                </div>
            )}
        </Modal>
    );
}
