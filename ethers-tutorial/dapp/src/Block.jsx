 import React, { useState, useEffect } from 'react';

 function Block({blocknum, provider}) {
    const [open, setOpen] = useState(false);
    const [block, setBlock] = useState();

    function toggle(){ setOpen(!open); }

    useEffect(() => {
        async function getBlock() {
          const blockInfo = await provider.getBlock(blocknum);
          console.log(blockInfo);
          setBlock(blockInfo);
        }
        if (!block){ getBlock(); }
      }
    );

    return (
        <div>
            <hr/>
            <button onClick={toggle}>Block # {blocknum}</button>
            {open && 
            <div>
                <p>Block hash: {block.hash}</p>
                <p>Parent hash: {block.parentHash} </p>
            </div>}
        
        </div>
    )
 }
 export default Block; 