const ProductTable = ({ products }) => {
  return (
    <div className="bg-[#020617] border border-gray-800 rounded-lg overflow-hidden">

      <table className="w-full text-sm text-left">

        {/* HEADER */}
        <thead className="text-gray-500 border-b border-gray-800">
          <tr>
            <th className="p-3">BARCODE</th>
            <th className="p-3">NAME</th>
            <th className="p-3">DESCRIPTION</th>
            <th className="p-3">QTY</th>
            <th className="p-3">UNIT PRICE</th>
            <th className="p-3">TOTAL VALUE</th>
            <th className="p-3">ACTIONS</th>
          </tr>
        </thead>

        {/* BODY */}
        <tbody>
          {products.length === 0 ? (
            <tr>
              <td colSpan="7" className="text-center py-10 text-gray-500">
                Loading...
              </td>
            </tr>
          ) : (
            products.map((p) => (
              <tr
                key={p.product_id}
                className="border-b border-gray-800 hover:bg-[#0B1220]"
              >
                <td className="p-3">{p.product_id}</td>
                <td className="p-3 font-semibold">{p.product_name}</td>
                <td className="p-3 text-gray-400">{p.description}</td>

                <td className="p-3 text-green-400">{p.quantity}</td>

                <td className="p-3 text-yellow-400">
                  ₹{p.unit_price}
                </td>

                <td className="p-3 text-green-400">
                  ₹{p.total_price}
                </td>

                <td className="p-3 flex gap-2">
                  <button className="px-2 py-1 bg-gray-700 rounded">🛒</button>
                  <button className="px-2 py-1 bg-gray-700 rounded">✏</button>
                </td>
              </tr>
            ))
          )}
        </tbody>

      </table>
    </div>
  );
};

export default ProductTable;