import React from 'react';

export default function PokemonBox(props) {
  // For displaying a Pokémon’s sprite and name
  return (
    <div>
      {/* Pokemon sprite and name UI */}
      {props.children}
    </div>
  );
}
