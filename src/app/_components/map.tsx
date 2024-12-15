import "leaflet/dist/leaflet.css";

import { Icon } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

import defaultIconPng from "leaflet/dist/images/marker-icon-2x.png";

const defaultIcon = new Icon({
	iconUrl: defaultIconPng as never,
	iconSize: [30, 47],
	iconAnchor: [12, 41],
	popupAnchor: [1, -34],
	shadowSize: [41, 41],
	className: "filter -hue-rotate-60",
});

export default function Map({
	entities,
}: {
	entities: { text: string; location: [number, number] }[];
}) {
	return (
		<MapContainer
			center={entities[0]?.location}
			zoom={16}
			className="w-full"
			style={{ height: "50rem" }} // TODO: After Tailwind v4, use h- class
		>
			<TileLayer
				attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
				url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
			/>
			{entities.map((entity, index) => (
				<Marker key={index} position={entity.location} icon={defaultIcon}>
					<Popup>{entity.text}</Popup>
				</Marker>
			))}
		</MapContainer>
	);
}
