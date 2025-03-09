import "leaflet/dist/leaflet.css";

import { type Dispatch, type SetStateAction } from "react";
import { icon, type LatLng } from "leaflet";
import {
	MapContainer,
	Marker,
	Popup,
	TileLayer,
	useMapEvents,
} from "react-leaflet";

// Fix required for map marker to show up, copied from:
// https://github.com/PaulLeCam/react-leaflet/issues/1108#issuecomment-1998102993
// We also take this chance to make the marker green, to better fit in with the
// rest of the app.
const defaultIcon = icon({
	iconUrl: "marker-icon.png",
	iconSize: [30, 47],
	iconAnchor: [12, 41],
	popupAnchor: [1, -34],
	shadowSize: [41, 41],
	className: "filter -hue-rotate-60",
});

export type MapMarker = { text: string; location: [number, number] };

export default function Map({
	markers,
	position,
	setPosition,
}: {
	markers?: MapMarker[];
	position?: LatLng | null;
	setPosition?: Dispatch<SetStateAction<LatLng | null>>;
}) {
	return (
		<MapContainer
			center={markers?.[0]?.location ?? [40.636, 22.944]}
			zoom={16}
			className="aspect-square w-full md:aspect-video"
			scrollWheelZoom={false}
		>
			<TileLayer
				attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
				url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
			/>
			<LocationMarker position={position} setPosition={setPosition} />
			{markers?.map((entity, index) => (
				<Marker key={index} position={entity.location} icon={defaultIcon}>
					<Popup>{entity.text}</Popup>
				</Marker>
			))}
		</MapContainer>
	);
}

function LocationMarker({
	position,
	setPosition,
}: {
	position?: LatLng | null;
	setPosition?: Dispatch<SetStateAction<LatLng | null>>;
}) {
	useMapEvents({
		click(e) {
			setPosition?.(e.latlng);
		},
	});

	return position ? <Marker position={position} icon={defaultIcon} /> : null;
}
