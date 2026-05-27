<?php

class ShoppingCart {
    private $items = array();
    private $discountCode = null;

    function addItem($name, $price, $qty) {
        $found = false;
        for ($i = 0; $i < count($this->items); $i++) {
            if ($this->items[$i]['name'] === $name) {
                $this->items[$i]['qty'] += $qty;
                $found = true;
                break;
            }
        }
        if (!$found) {
            $this->items[] = array(
                'name' => $name,
                'price' => $price,
                'qty' => $qty
            );
        }
    }

    function removeItem($name) {
        $newItems = array();
        foreach ($this->items as $item) {
            if ($item['name'] !== $name) {
                $newItems[] = $item;
            }
        }
        $this->items = $newItems;
    }

    function applyDiscount($code) {
        $validCodes = array('HALF' => 0.5, 'TENTH' => 0.1, 'QUARTER' => 0.25);
        if (array_key_exists($code, $validCodes)) {
            $this->discountCode = $code;
            return true;
        }
        return false;
    }

    function getSubtotal() {
        $subtotal = 0;
        foreach ($this->items as $item) {
            $subtotal += $item['price'] * $item['qty'];
        }
        return $subtotal;
    }

    function getDiscount() {
        $discountRates = array('HALF' => 0.5, 'TENTH' => 0.1, 'QUARTER' => 0.25);
        if ($this->discountCode !== null && array_key_exists($this->discountCode, $discountRates)) {
            return $this->getSubtotal() * $discountRates[$this->discountCode];
        }
        return 0;
    }

    function calculateTax($rate) {
        $taxable = $this->getSubtotal() - $this->getDiscount();
        return $taxable * ($rate / 100);
    }

    function getTotal($taxRate = 18) {
        $subtotal = $this->getSubtotal();
        $discount = $this->getDiscount();
        $taxable = $subtotal - $discount;
        $tax = $taxable * ($taxRate / 100);
        return $taxable + $tax;
    }

    function getItemCount() {
        $count = 0;
        foreach ($this->items as $item) {
            $count += $item['qty'];
        }
        return $count;
    }

    function getItems() {
        return $this->items;
    }

    function clearCart() {
        $this->items = array();
        $this->discountCode = null;
    }

    function getSummary() {
        $summary = "Cart Summary:\n";
        $summary .= "Items: " . $this->getItemCount() . "\n";
        $summary .= "Subtotal: $" . number_format($this->getSubtotal(), 2) . "\n";
        $discount = $this->getDiscount();
        if ($discount > 0) {
            $summary .= "Discount: -$" . number_format($discount, 2) . "\n";
        }
        $summary .= "Tax (18%): $" . number_format($this->calculateTax(18), 2) . "\n";
        $summary .= "Total: $" . number_format($this->getTotal(), 2) . "\n";
        return $summary;
    }
}

function processOrder($cartData, $customerEmail) {
    $cart = new ShoppingCart();
    foreach ($cartData['items'] as $item) {
        $cart->addItem($item['name'], $item['price'], $item['qty']);
    }
    if (isset($cartData['discount'])) {
        $cart->applyDiscount($cartData['discount']);
    }
    $total = $cart->getTotal();
    if ($total <= 0) {
        return array('success' => false, 'error' => 'Invalid total');
    }
    return array(
        'success' => true,
        'email' => $customerEmail,
        'total' => $total,
        'items' => $cart->getItemCount(),
        'summary' => $cart->getSummary()
    );
}

?>
