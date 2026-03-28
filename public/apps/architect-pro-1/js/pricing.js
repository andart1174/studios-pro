// pricing.js

const PricingParams = {
    currency: '$',
    baseRates: {
        // defaults per material
        wall: 15.00, // per sq meter
        floor: 25.00, // per sq meter
        roof: 40.00,  // per sq meter
    }
};

class PricingEngine {

    static calculateTotal(elements) {
        let total = 0;

        elements.forEach(el => {
            // Direct cost override
            if (el.cost && el.cost > 0) {
                total += parseFloat(el.cost);
            } else {
                // Calculate based on surface area if no fixed cost
                if (el.type === 'wall') {
                    // len is cm, height is cm -> sq meter
                    const sqM = (el.length / 100) * (el.height / 100);
                    total += sqM * PricingParams.baseRates.wall;
                } else if (el.type === 'floor' || el.type === 'roof') {
                    // area calculation relies on polygon area, approximation for now
                    // For now let's just use bounding box if area not explicitly calculated
                    const wM = (el.width || 100) / 100;
                    const hM = (el.height || 100) / 100;
                    const area = wM * hM;
                    total += area * PricingParams.baseRates[el.type];
                } else if (el.type === 'door' || el.type === 'window') {
                    // Default pricing if none provided
                    total += (el.type === 'door') ? 150.00 : 120.00;
                }
            }
        });

        return total;
    }

    static updateTotalUI(elements) {
        const total = this.calculateTotal(elements);
        const badge = document.querySelector('#totalPriceBadge .price-value');
        if (badge) {
            badge.textContent = total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
    }

}
