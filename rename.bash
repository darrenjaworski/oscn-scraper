for folder in $(ls files)
do
    date=${folder:3:2}
    month=${folder:0:2}
    year=${folder:6:4}

    mkdir -p files/$year
    git mv files/$folder files/$year
    git mv files/$year/$folder/ files/$year/$month-$date
done
echo all files have been renamed