const getOrientations = (
    length,
    width,
    height
) => {

    return [
        [length, width, height],
        [length, height, width],
        [width, length, height],
        [width, height, length],
        [height, length, width],
        [height, width, length]
    ];
};


const canFit = (
    item,
    space
) => {

    return (
        item.length <= space.length &&
        item.width <= space.width &&
        item.height <= space.height
    );
};


const createSpace = (
    length,
    width,
    height,
    x = 0,
    y = 0,
    z = 0
) => {

    return {
        x,
        y,
        z,

        length,
        width,
        height
    };
};


const createPackage = (
    box
) => {

    return {
        boxId: box._id,

        packageName: box.name,

        length: box.length,
        width: box.width,
        height: box.height,

        maxWeight:
            box.maxWeight,

        weight: 0,

        items: [],

        freeSpaces: [
            createSpace(
                box.length,
                box.width,
                box.height
            )
        ]
    };
};


const splitSpace = (
    space,
    item
) => {

    const spaces = [];


    if (
        space.length >
        item.length
    ) {

        spaces.push(
            createSpace(
                space.length -
                    item.length,

                space.width,

                space.height,

                space.x +
                    item.length,

                space.y,

                space.z
            )
        );
    }


    if (
        space.width >
        item.width
    ) {

        spaces.push(
            createSpace(
                item.length,

                space.width -
                    item.width,

                space.height,

                space.x,

                space.y +
                    item.width,

                space.z
            )
        );
    }


    if (
        space.height >
        item.height
    ) {

        spaces.push(
            createSpace(
                item.length,

                item.width,

                space.height -
                    item.height,

                space.x,

                space.y,

                space.z +
                    item.height
            )
        );
    }


    return spaces;
};


const tryPlaceItem = (
    packageData,
    item
) => {

    for (
        let i = 0;
        i < packageData.freeSpaces.length;
        i++
    ) {

        const space =
            packageData.freeSpaces[i];


        const orientations =
            getOrientations(
                item.length,
                item.width,
                item.height
            );


        for (
            const [
                length,
                width,
                height
            ] of orientations
        ) {

            const orientedItem = {
                length,
                width,
                height
            };


            if (
                !canFit(
                    orientedItem,
                    space
                )
            ) {
                continue;
            }


            packageData.freeSpaces.splice(
                i,
                1
            );


            const newSpaces =
                splitSpace(
                    space,
                    orientedItem
                );


            packageData.freeSpaces.push(
                ...newSpaces
            );


            packageData.items.push({
                product: item.product,

                name: item.name,

                qty: 1,

                weight:
                    item.weight,

                length,

                width,

                height,

                position: {
                    x: space.x,
                    y: space.y,
                    z: space.z
                }
            });


            packageData.weight +=
                item.weight;


            return true;
        }
    }


    return false;
};


export const createPackages = (
    items,
    boxes
) => {

    if (!items.length) {
        return [];
    }


    if (!boxes.length) {
        throw new Error(
            "No active shipping packages available"
        );
    }


    /*
        Smallest box first.
    */

    const sortedBoxes =
        [...boxes].sort(
            (a, b) => {

                const volumeA =
                    a.length *
                    a.width *
                    a.height;

                const volumeB =
                    b.length *
                    b.width *
                    b.height;

                return volumeA - volumeB;
            }
        );


    const packages = [];


    /*
        Expand quantity.

        A × 3 becomes:

        A
        A
        A
    */

    const expandedItems = [];


    for (const item of items) {

        for (
            let i = 0;
            i < item.qty;
            i++
        ) {

            expandedItems.push({
                ...item,
                qty: 1
            });
        }
    }


    /*
        Larger products first.
    */

    expandedItems.sort(
        (a, b) => {

            const volumeA =
                a.length *
                a.width *
                a.height;

            const volumeB =
                b.length *
                b.width *
                b.height;

            return volumeB - volumeA;
        }
    );


    for (
        const item of expandedItems
    ) {

        let placed = false;


        /*
            First try existing packages.
        */

        for (
            const packageData
            of packages
        ) {

            if (
                packageData.weight +
                    item.weight >
                packageData.maxWeight
            ) {
                continue;
            }


            const result =
                tryPlaceItem(
                    packageData,
                    item
                );


            if (result) {

                placed = true;

                break;
            }
        }


        if (placed) {
            continue;
        }


        /*
            Product could not fit
            in existing package.

            Create a new package.
        */

        let newPackage = null;


        for (
            const box
            of sortedBoxes
        ) {

            if (
                item.weight >
                box.maxWeight
            ) {
                continue;
            }


            const packageData =
                createPackage(box);


            const result =
                tryPlaceItem(
                    packageData,
                    item
                );


            if (result) {

                newPackage =
                    packageData;

                break;
            }
        }


        if (!newPackage) {

            throw new Error(
                `Product ${item.name} cannot fit in any available shipping package`
            );
        }


        packages.push(
            newPackage
        );
    }


    /*
        Return only information
        required by shipping.
    */

    return packages.map(
        (packageData) => {

            return {
                boxId:
                    packageData.boxId,

                packageName:
                    packageData.packageName,

                weight:
                    Number(
                        packageData.weight.toFixed(3)
                    ),

                length:
                    packageData.length,

                width:
                    packageData.width,

                height:
                    packageData.height,

                items:
                    packageData.items
            };
        }
    );
};