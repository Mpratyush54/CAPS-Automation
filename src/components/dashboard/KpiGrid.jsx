import KpiCard from '../ui/KpiCard';

const KpiGrid = ({ items, columns = 4 }) => (
  <div 
    className={`grid-cols-${columns}`} 
    style={{ 
      display: 'grid', 
      gap: '1rem',
      marginBottom: 0 
    }}
  >
    {items.map((item) => (
      <KpiCard 
        key={item.label}
        icon={item.icon}
        label={item.label}
        value={item.value}
        delta={item.delta}
        variant="primary" // Logic could be added here for different variants
      />
    ))}
  </div>
);

export default KpiGrid;
