package samples;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * GodOrderManager illustrates God Class / Large Class smell,
 * Feature Envy (manipulating OrderData internals), and Long Method.
 */
public class GodOrderManager {

    // Smell: DataClass
    public static class OrderData {
        public String orderId;
        public String customerEmail;
        public double subtotal;
        public double tax;
        public double shippingFee;
        public double total;
        public String status;
        public List<String> items = new ArrayList<>();
    }

    private final Map<String, OrderData> orders = new HashMap<>();
    private int counter = 0;

    // Smell: Long Method and Feature Envy
    public OrderData processAndFulfillOrder(String id, String email, List<String> rawItems,
                                             double taxRate, double discountPercent, boolean rush) {
        OrderData order = new OrderData();
        order.orderId = id;
        order.customerEmail = email;
        order.status = "PENDING";

        double calculatedSubtotal = 0.0;
        for (String item : rawItems) {
            order.items.add(item);
            if (item.startsWith("PROMO_")) {
                calculatedSubtotal += 10.0;
            } else if (item.startsWith("PREMIUM_")) {
                calculatedSubtotal += 50.0;
            } else {
                calculatedSubtotal += 20.0;
            }
        }

        if (discountPercent > 0) {
            calculatedSubtotal -= (calculatedSubtotal * (discountPercent / 100.0));
        }

        double calculatedTax = calculatedSubtotal * taxRate;
        double calculatedShipping = rush ? 25.0 : 5.0;

        order.subtotal = calculatedSubtotal;
        order.tax = calculatedTax;
        order.shippingFee = calculatedShipping;
        order.total = calculatedSubtotal + calculatedTax + calculatedShipping;

        if (order.total > 500.0) {
            order.status = "VIP_APPROVED";
        } else {
            order.status = "STANDARD_APPROVED";
        }

        orders.put(id, order);
        counter++;
        return order;
    }
}
